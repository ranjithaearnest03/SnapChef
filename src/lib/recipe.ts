import type { Ingredient } from './ingredients'

export type Diet = 'any' | 'vegetarian' | 'vegan'
export type Mood = 'comfort' | 'light' | 'spicy' | 'quick'

export interface Prefs {
  diet: Diet
  time: 15 | 30 | 60
  servings: number
  mood: Mood
  staples: boolean
}

export interface Recipe {
  id: string
  title: string
  tagline: string
  minutes: number
  servings: number
  difficulty: 'Easy' | 'Medium'
  ingredients: { item: string; amount: string; have: boolean }[]
  steps: { title: string; text: string; minutes?: number }[]
  tip: string
  source: 'llm' | 'chef-engine'
  used: number
  total: number
  skipped: string[]
  notice?: string
  createdAt: number
}

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36)

/* ------------------------------------------------------------------ */
/*  LLM generation (keyless public endpoint) with offline fallback    */
/* ------------------------------------------------------------------ */

const PUBLIC_LLM = 'https://text.pollinations.ai/openai'
const LLM_KEY = 'snapchef:llm:v1'

export interface LlmConfig {
  baseUrl: string
  apiKey: string
  model: string
}

export const LLM_PRESETS: { label: string; baseUrl: string; model: string }[] = [
  { label: 'Google Gemini (Free & Best)', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-2.0-flash' },
  { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
  { label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', model: 'google/gemini-2.0-flash-exp:free' },
]

export function loadLlmConfig(): LlmConfig | null {
  try {
    const raw = localStorage.getItem(LLM_KEY)
    const c = raw ? (JSON.parse(raw) as LlmConfig) : null
    if (c && c.apiKey && c.baseUrl && c.model) return c
    const envKey = import.meta.env.VITE_GEMINI_API_KEY
    if (envKey) {
      return {
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        model: 'gemini-2.0-flash',
        apiKey: envKey,
      }
    }
    return null
  } catch {
    return null
  }
}

export function saveLlmConfig(c: LlmConfig | null) {
  try {
    if (c) localStorage.setItem(LLM_KEY, JSON.stringify(c))
    else localStorage.removeItem(LLM_KEY)
  } catch {
    /* ignore */
  }
}

function buildPrompt(items: Ingredient[], p: Prefs, prevTitle?: string) {
  const list = items.map((i) => i.name).join(', ')
  const staples = p.staples
    ? 'salt, black pepper, cooking oil, water, soy sauce, vinegar, sugar and common dried spices'
    : 'salt, black pepper, cooking oil and water only'
  return `You are SnapChef, a warm, practical home-cooking assistant that fights food waste.
A computer-vision model detected these ingredients in the user's kitchen: ${list}.

Create ONE realistic, delicious recipe using mainly these ingredients. You may also use these pantry staples: ${staples}. Do NOT require any other ingredient.
Constraints: diet = ${p.diet}; max total time = ${p.time} minutes; servings = ${p.servings}; mood = ${p.mood}.
${prevTitle ? `The user wants something different from "${prevTitle}".` : ''}
Use as many of the detected ingredients as makes culinary sense. If an ingredient does not suit the diet, leave it out.

Respond with ONLY valid JSON (no markdown) in exactly this shape:
{"title":string,"tagline":string (max 14 words),"totalMinutes":number,"difficulty":"Easy"|"Medium","ingredients":[{"item":string,"amount":string,"fromPhoto":boolean}],"steps":[{"title":string (2-4 words),"text":string (1-3 sentences, with temperatures/times),"minutes":number}],"zeroWasteTip":string}
Use 5-8 steps.`
}

function extractJson(text: string): unknown {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end < 0) throw new Error('No JSON in response')
  return JSON.parse(text.slice(start, end + 1))
}

interface LlmShape {
  title: string
  tagline?: string
  totalMinutes?: number
  difficulty?: string
  ingredients: { item: string; amount?: string; fromPhoto?: boolean }[]
  steps: { title?: string; text: string; minutes?: number }[]
  zeroWasteTip?: string
}

async function generateWithLLM(items: Ingredient[], p: Prefs, prevTitle: string | undefined, cfg: LlmConfig | null): Promise<Recipe> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 45000)

  if (cfg && (cfg.baseUrl.includes('googleapis') || cfg.apiKey.startsWith('AIza'))) {
    try {
      const gUrl = `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model || 'gemini-2.0-flash'}:generateContent?key=${cfg.apiKey}`
      const res = await fetch(gUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(items, p, prevTitle) }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const gText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
        const r = extractJson(gText) as LlmShape
        if (r.title && Array.isArray(r.ingredients) && Array.isArray(r.steps) && r.steps.length >= 3) {
          const ingText = r.ingredients.map((i) => String(i.item).toLowerCase()).join(' | ')
          const used = items.filter((i) => {
            const n = i.name.toLowerCase().replace('leftover ', '')
            const stem = n.endsWith('s') ? n.slice(0, -1) : n
            return ingText.includes(stem)
          }).length
          const minutes = Math.round(
            r.totalMinutes && r.totalMinutes > 0 ? r.totalMinutes : r.steps.reduce((a, s) => a + (s.minutes ?? 3), 0),
          )
          clearTimeout(timer)
          return {
            id: uid(),
            title: String(r.title),
            tagline: String(r.tagline ?? ''),
            minutes,
            servings: p.servings,
            difficulty: r.difficulty === 'Medium' ? 'Medium' : 'Easy',
            ingredients: r.ingredients.map((i) => ({
              item: String(i.item),
              amount: String(i.amount ?? ''),
              have: Boolean(i.fromPhoto ?? true),
            })),
            steps: r.steps.map((s, idx) => ({
              title: s.title ? String(s.title) : `Step ${idx + 1}`,
              text: String(s.text),
              minutes: s.minutes,
            })),
            tip: String(r.zeroWasteTip ?? ''),
            source: 'llm',
            used,
            total: items.length,
            skipped: [],
            createdAt: Date.now(),
          }
        }
      }
    } catch (e) {
      console.warn('Gemini recipe call failed, falling back to standard LLM / offline:', e)
    }
  }

  const url = cfg ? `${cfg.baseUrl.replace(/\/$/, '')}/chat/completions` : PUBLIC_LLM
  const call = (json: boolean) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(cfg ? { Authorization: `Bearer ${cfg.apiKey}` } : {}) },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: cfg?.model ?? 'openai',
        messages: [{ role: 'user', content: buildPrompt(items, p, prevTitle) }],
        ...(json ? { response_format: { type: 'json_object' } } : {}),
        ...(cfg ? {} : { seed: Math.floor(Math.random() * 100000) }),
      }),
    })
  try {
    let res = await call(true)
    if (res.status === 400 && cfg) res = await call(false)
    if (!res.ok) throw new Error('LLM HTTP ' + res.status)
    const data = await res.json()
    const content: string = data?.choices?.[0]?.message?.content ?? ''
    const r = extractJson(content) as LlmShape
    if (!r.title || !Array.isArray(r.ingredients) || !Array.isArray(r.steps) || r.steps.length < 3) {
      throw new Error('Malformed recipe')
    }
    const ingText = r.ingredients.map((i) => String(i.item).toLowerCase()).join(' | ')
    const used = items.filter((i) => {
      const n = i.name.toLowerCase().replace('leftover ', '')
      const stem = n.endsWith('s') ? n.slice(0, -1) : n
      return ingText.includes(stem)
    }).length
    const minutes = Math.round(
      r.totalMinutes && r.totalMinutes > 0 ? r.totalMinutes : r.steps.reduce((a, s) => a + (s.minutes ?? 3), 0),
    )
    return {
      id: uid(),
      title: String(r.title),
      tagline: String(r.tagline ?? ''),
      minutes,
      servings: p.servings,
      difficulty: r.difficulty === 'Medium' ? 'Medium' : 'Easy',
      ingredients: r.ingredients.map((i) => ({
        item: String(i.item),
        amount: String(i.amount ?? ''),
        have: i.fromPhoto !== false,
      })),
      steps: r.steps.map((s, idx) => ({
        title: String(s.title ?? `Step ${idx + 1}`),
        text: String(s.text),
        minutes: typeof s.minutes === 'number' && s.minutes > 0 ? Math.round(s.minutes) : undefined,
      })),
      tip: String(r.zeroWasteTip ?? ''),
      source: 'llm',
      used,
      total: items.length,
      skipped: [],
      createdAt: Date.now(),
    }
  } finally {
    clearTimeout(timer)
  }
}

export async function generateRecipe(
  items: Ingredient[],
  p: Prefs,
  seed: number,
  prevTitle?: string,
): Promise<Recipe> {
  const cfg = loadLlmConfig()
  try {
    return await generateWithLLM(items, p, prevTitle, cfg)
  } catch (e) {
    const r = buildOffline(items, p, seed)
    const why = e instanceof Error ? e.message : 'unreachable'
    r.notice = cfg
      ? `Your LLM request failed (${why}), so the built-in offline chef engine wrote this recipe. Check your key in AI settings.`
      : 'The shared LLM endpoint was unavailable, so the built-in offline chef engine wrote this recipe. Add your own API key in AI settings to use a live LLM.'
    return r
  }
}

/* ------------------------------------------------------------------ */
/*  Offline "chef engine" – rule-based fallback, works with no network  */
/* ------------------------------------------------------------------ */

const fmt = (n: number) => {
  if (n >= 10) return String(Math.round(n))
  const r = Math.round(n * 4) / 4
  const whole = Math.floor(r)
  const frac = r - whole
  const f = frac === 0.25 ? '¼' : frac === 0.5 ? '½' : frac === 0.75 ? '¾' : ''
  return `${whole || ''}${f}` || '¼'
}

const list = (xs: string[]) =>
  xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`
const lc = (s: string) => s.toLowerCase()
const cap = (s: string) => s.replace(/\b\w/, (c) => c.toUpperCase())
const tl = (xs: Ingredient[]) =>
  xs.length <= 1 ? (xs[0]?.name ?? '') : `${xs.slice(0, -1).map((x) => x.name).join(', ')} & ${xs[xs.length - 1].name}`

interface Step {
  title: string
  text: string
  minutes?: number
}
interface Draft {
  title: string
  tagline: string
  steps: Step[]
  uses: Ingredient[]
  staples: string[]
}

function buildOffline(all: Ingredient[], p: Prefs, seed: number): Recipe {
  const skipped: string[] = []
  const pool = all.filter((i) => {
    const bad = (p.diet === 'vegan' && (i.animal || i.meat)) || (p.diet === 'vegetarian' && i.meat)
    if (bad) skipped.push(i.name)
    return !bad
  })
  const S = p.servings
  const quick = p.time <= 15 || p.mood === 'quick'
  const spicy = p.mood === 'spicy'
  const light = p.mood === 'light'
  const st = p.staples

  const cat = (c: Ingredient['cat']) => pool.filter((i) => i.cat === c)
  const has = (id: string) => pool.find((i) => i.id === id)
  const eggs = has('egg')
  const proteins = cat('protein').filter((i) => i.id !== 'egg')
  const vegs = [...cat('veg'), ...cat('misc')]
  const aroma = vegs.filter((v) => v.id === 'onion' || v.id === 'garlic')
  const mainVeg = vegs.filter((v) => v.id !== 'onion' && v.id !== 'garlic')
  const veg4 = (mainVeg.length ? mainVeg : vegs).slice(0, 4)
  const fruits = cat('fruit')
  const citrus = fruits.find((f) => f.citrus)
  const crunchy = fruits.filter((f) => !f.citrus)
  const rice = has('rice')
  const pasta = has('pasta') ?? has('noodles')
  const bread = has('bread') ?? has('tortilla')
  const dairy = cat('dairy')
  const cheese = has('cheese')
  const butter = has('butter')
  const milk = has('milk') ?? has('yogurt')
  const leftovers = cat('leftover')
  const protein = proteins[0]
  const heat = spicy ? ' Add a generous pinch of chili flakes or hot sauce.' : ''
  const names = (xs: Ingredient[]) => list(xs.map((x) => lc(x.name)))
  const titleVeg = (n: number, fallback: string) => tl(veg4.slice(0, n)) || fallback

  const firmVeg = veg4.filter((v) => v.firm)
  const softVeg = veg4.filter((v) => !v.firm)
  const sequenceVeg = () =>
    firmVeg.length && softVeg.length
      ? `Add the firmer vegetables (${names(firmVeg)}) and cook 3–4 minutes, then the softer ones (${names(softVeg)}) for 2 minutes more, until crisp-tender.`
      : `Add ${names(veg4)} and cook ${firmVeg.length ? '5–6' : '3–4'} minutes, tossing often, until crisp-tender.`

  const finish = ((): { text: string; uses: Ingredient[] } | null => {
    if (citrus && crunchy.length)
      return {
        text: `Squeeze the ${lc(citrus.name)} over everything for a bright glaze, and slice the ${names(crunchy)} on the side as a crunchy, fresh counterpoint.`,
        uses: [citrus, ...crunchy],
      }
    if (citrus) return { text: `Finish with the juice (and a little zest) of the ${lc(citrus.name)} — it lifts every flavour.`, uses: [citrus] }
    if (crunchy.length)
      return { text: `Slice the ${names(crunchy)} thinly and serve alongside as a juicy, crunchy side.`, uses: crunchy }
    return null
  })()
  const fin = finish?.uses ?? []
  const sauce = st
    ? 'Splash in 1 tbsp soy sauce and a teaspoon of vinegar and toss for 30 seconds until glossy.'
    : 'Season well with salt and pepper and toss until coated.'
  const protVerb = protein ? (protein.id === 'tofu' || protein.id === 'beans' ? 'drain and pat dry' : 'slice') : ''

  /* ---- dishes ---- */
  const skillet = (): Draft => {
    const steps: Step[] = [
      { title: 'Prep', text: `Wash and cut ${names(veg4)} into bite-size pieces${protein ? `; ${protVerb} the ${lc(protein.name)}` : ''}.${aroma.length ? ` Finely chop the ${names(aroma)}.` : ''}`, minutes: 8 },
      { title: 'Heat the pan', text: 'Heat 1 tbsp oil in a large skillet or wok over high heat until it shimmers.', minutes: 2 },
    ]
    if (protein)
      steps.push({ title: 'Sear protein', text: `Add the ${lc(protein.name)}, season with salt and pepper and cook 4–5 minutes until golden. Move to the edge of the pan.${heat}`, minutes: 5 })
    if (aroma.length) steps.push({ title: 'Build flavour', text: `Add the ${names(aroma)} and stir 30–60 seconds until fragrant.`, minutes: 1 })
    steps.push({ title: 'Cook the veg', text: sequenceVeg() + (protein ? '' : heat), minutes: 6 })
    steps.push({ title: 'Sauce it', text: sauce + (protein ? ' Stir everything together.' : ''), minutes: 1 })
    steps.push({ title: 'Serve', text: `${rice ? 'Serve over steamed rice. ' : ''}${finish ? finish.text : 'Serve straight from the pan while hot.'}`, minutes: 2 })
    return {
      title: `${spicy ? 'Fiery ' : ''}${protein ? protein.name + ' & ' : ''}${titleVeg(3, 'Garden')} Stir-Fry`,
      tagline: 'One pan, high heat, zero waste — dinner in minutes.',
      steps,
      uses: [...(protein ? [protein] : []), ...aroma, ...veg4, ...fin, ...(rice ? [rice] : [])],
      staples: ['Cooking oil — 1 tbsp', 'Salt & pepper — to taste', ...(st ? ['Soy sauce — 1 tbsp', 'Vinegar — 1 tsp'] : [])],
    }
  }

  const friedRice = (): Draft => {
    const r = rice!
    const base = veg4.length ? veg4 : aroma
    const steps: Step[] = [
      quick
        ? { title: 'Rice ready', text: `Use day-old cooked rice if you have it, or microwave ${fmt(r.per * S)} cup of rice with a splash of water, then spread it on a plate to dry out.`, minutes: 6 }
        : { title: 'Cook the rice', text: `Rinse ${fmt(r.per * S)} cup rice and simmer with 1 cup water per ½ cup rice, covered, for 14 minutes. Spread on a tray to cool and dry out.`, minutes: 18 },
      { title: 'Prep', text: `Dice ${names(base)}${protein ? ` and the ${lc(protein.name)}` : ''} into small, even pieces so they cook quickly.`, minutes: 7 },
      { title: 'Sizzle', text: `Heat 1 tbsp oil in a large pan over high heat. ${protein ? `Cook the ${lc(protein.name)} 4 minutes, then ` : ''}add the vegetables and stir-fry 4 minutes.${heat}`, minutes: 8 },
    ]
    if (eggs)
      steps.push({ title: 'Scramble egg', text: `Push everything to one side, crack in ${fmt(eggs.per * Math.ceil(S / 2))} egg(s) and scramble until just set, then mix together.`, minutes: 2 })
    steps.push({ title: 'Fry the rice', text: `Add the cooled rice, press it into the pan and let it crisp for 1 minute before tossing. Repeat for 3 minutes. ${st ? 'Season with soy sauce and a pinch of pepper.' : 'Season with salt and pepper.'}`, minutes: 4 })
    steps.push({ title: 'Serve', text: finish ? finish.text : 'Taste, adjust seasoning and serve piping hot.', minutes: 1 })
    return {
      title: `${spicy ? 'Spicy ' : ''}${eggs ? 'Egg & ' : ''}${titleVeg(2, 'Kitchen-Sink')} Fried Rice`,
      tagline: 'The ultimate fridge-clearing classic.',
      steps,
      uses: [r, ...(protein ? [protein] : []), ...aroma, ...veg4, ...(eggs ? [eggs] : []), ...fin],
      staples: ['Cooking oil — 1 tbsp', 'Salt & pepper — to taste', ...(st ? ['Soy sauce — 1 tbsp'] : [])],
    }
  }

  const pastaToss = (): Draft => {
    const pa = pasta!
    return {
      title: `${titleVeg(2, 'Pantry')} ${cheese ? 'Cheesy ' : ''}${pa.id === 'noodles' ? 'Noodle' : 'Pasta'} Toss`,
      tagline: 'Silky, savoury and ready with one pot and one pan.',
      steps: [
        { title: 'Boil water', text: `Bring a big pot of well-salted water to a boil. Cook ${fmt(pa.per * S)} g ${lc(pa.name)} until al dente (about 9–10 minutes). Save a mug of the cooking water, then drain.`, minutes: 11 },
        { title: 'Prep', text: `While it cooks, chop ${names(veg4.length ? veg4 : aroma)}${protein ? ` and the ${lc(protein.name)}` : ''}.`, minutes: 6 },
        { title: 'Sauté', text: `Heat 2 tbsp ${butter ? 'butter or oil' : 'oil'} in a wide pan over medium-high. ${protein ? `Brown the ${lc(protein.name)} for 4 minutes. ` : ''}${aroma.length ? `Add the ${names(aroma)} for 1 minute. ` : ''}Add the vegetables and cook until tender, 5–6 minutes.${heat}`, minutes: 8 },
        { title: 'Toss', text: `Add the pasta and a splash of the starchy water. Toss over heat for 1 minute until silky${cheese ? ', then stir through the grated cheese' : ''}.`, minutes: 2 },
        { title: 'Finish', text: finish ? finish.text : 'Season with salt and plenty of black pepper, and serve immediately.', minutes: 1 },
      ],
      uses: [pa, ...(protein ? [protein] : []), ...aroma, ...veg4, ...(cheese ? [cheese] : []), ...(butter ? [butter] : []), ...fin],
      staples: ['Salt — for the pasta water', 'Cooking oil — 2 tbsp', 'Black pepper — to taste'],
    }
  }

  const frittata = (): Draft => {
    const e = eggs!
    const steps: Step[] = [
      { title: 'Prep', text: `Chop ${names([...aroma, ...veg4]) || 'your vegetables'} small${protein ? ` and dice the ${lc(protein.name)}` : ''}${cheese ? '; grate the cheese' : ''}.`, minutes: 6 },
      { title: 'Whisk', text: `Beat ${fmt(e.per * S)} eggs with ${milk ? 'a splash of ' + lc(milk.name) + ', ' : ''}½ tsp salt and plenty of pepper.${heat}`, minutes: 2 },
      { title: 'Sauté', text: `Warm 1 tbsp ${butter ? 'butter' : 'oil'} in an oven-safe skillet over medium heat and cook ${protein ? 'the protein and ' : ''}the vegetables 4–5 minutes until softened.`, minutes: 5 },
    ]
    if (quick) {
      steps.push({ title: 'Scramble', text: `Pour in the eggs and stir gently with a spatula for 2–3 minutes until just set and creamy.${cheese ? ' Fold in the cheese.' : ''}`, minutes: 3 })
    } else {
      steps.push({ title: 'Set the base', text: 'Pour the eggs over the vegetables and cook without stirring on medium-low for 4–5 minutes until the edges set.', minutes: 5 })
      steps.push({ title: 'Finish', text: `${cheese ? 'Scatter over the cheese, then ' : ''}slide under a hot grill (or into a 200°C / 400°F oven) for 4–5 minutes until puffed and golden.`, minutes: 5 })
    }
    steps.push({ title: 'Serve', text: `${bread ? 'Serve with toasted bread. ' : ''}${finish ? finish.text : 'Slice into wedges and serve warm or at room temperature.'}`, minutes: 1 })
    const v = titleVeg(2, '')
    return {
      title: quick ? `Loaded ${v || 'Veggie'} Scramble` : `${v || 'Garden'} ${cheese ? '& Cheese ' : ''}Frittata`,
      tagline: 'Protein-packed, endlessly adaptable and nearly effortless.',
      steps,
      uses: [e, ...aroma, ...veg4, ...(cheese ? [cheese] : []), ...(milk ? [milk] : []), ...(protein ? [protein] : []), ...(bread ? [bread] : []), ...fin],
      staples: ['Cooking oil — 1 tbsp', 'Salt & pepper — to taste'],
    }
  }

  const toastWrap = (): Draft => {
    const b = bread!
    const isWrap = b.id === 'tortilla'
    return {
      title: `${titleVeg(2, 'Loaded')} ${isWrap ? 'Wraps' : 'Toasts'}`,
      tagline: 'Handheld, fast and perfect for stragglers in the crisper drawer.',
      steps: [
        { title: 'Prep', text: `${light ? 'Thinly slice' : 'Slice'} ${names(veg4.length ? veg4 : aroma) || 'your vegetables'}${protein ? `, and slice the ${lc(protein.name)}` : ''}.`, minutes: 6 },
        { title: 'Cook filling', text: `Heat 1 tbsp oil in a skillet. Cook ${protein ? 'the ' + lc(protein.name) + ' for 4 minutes, then the veg' : 'the veg'} for 4–5 minutes with salt and pepper.${eggs ? ' Fry or scramble the eggs alongside.' : ''}${heat}`, minutes: 8 },
        { title: isWrap ? 'Warm tortillas' : 'Toast bread', text: isWrap ? 'Warm the tortillas in a dry pan for 20 seconds per side.' : 'Toast the slices until golden and crisp.', minutes: 3 },
        { title: 'Assemble', text: `${isWrap ? 'Fill and fold the tortillas' : 'Pile the filling on the toast'}${cheese ? ', topping with cheese so it melts from the heat' : ''}.`, minutes: 2 },
        { title: 'Serve', text: finish ? finish.text : 'Eat while warm.', minutes: 1 },
      ],
      uses: [b, ...(protein ? [protein] : []), ...(eggs ? [eggs] : []), ...veg4, ...(cheese ? [cheese] : []), ...fin],
      staples: ['Cooking oil — 1 tbsp', 'Salt & pepper — to taste'],
    }
  }

  const roast = (): Draft => {
    const steps: Step[] = quick
      ? [
          { title: 'Slice thin', text: `Slice ${names(veg4)} into thin, quick-cooking pieces.`, minutes: 5 },
          { title: 'Sear', text: `Heat 2 tbsp oil in a wide skillet over medium-high. Add the vegetables in a single layer and sear 3 minutes without moving, then flip.${heat}`, minutes: 8 },
          { title: 'Season', text: 'Season with salt and pepper and cook 2 minutes more until charred at the edges.', minutes: 2 },
          { title: 'Serve', text: finish ? finish.text : 'Serve warm.', minutes: 1 },
        ]
      : [
          { title: 'Preheat', text: 'Heat the oven to 220°C / 425°F with a baking sheet inside.', minutes: 10 },
          { title: 'Chop', text: `Cut ${names(veg4)} into evenly sized chunks (about 3 cm) so they cook at the same speed.${protein ? ` Cut the ${lc(protein.name)} to match.` : ''}`, minutes: 8 },
          { title: 'Season', text: `Toss with 2 tbsp oil, ½ tsp salt and pepper${st ? ', and any dried spice you like' : ''}.${heat}`, minutes: 2 },
          { title: 'Roast', text: `Spread on the hot tray in a single layer and roast ${protein ? '25–30' : '22–28'} minutes, flipping halfway, until caramelised at the edges.`, minutes: 26 },
          { title: 'Finish', text: `${rice ? 'Serve over steamed rice. ' : ''}${finish ? finish.text : 'Taste, adjust the salt and serve hot.'}`, minutes: 2 },
        ]
    return {
      title: `${quick ? 'Seared' : 'Sheet-Pan Roasted'} ${titleVeg(3, 'Vegetables')}${citrus ? ` with ${citrus.name.replace(/s$/, '')} Glaze` : ''}`,
      tagline: 'Caramelised edges, minimal washing-up.',
      steps,
      uses: [...veg4, ...aroma, ...(protein ? [protein] : []), ...fin, ...(rice ? [rice] : [])],
      staples: ['Cooking oil — 2 tbsp', 'Salt & pepper — to taste'],
    }
  }

  const soup = (): Draft => {
    const base = vegs.slice(0, 5)
    return {
      title: `Cozy ${tl(base.slice(0, 2))} Soup`,
      tagline: 'Velvety, forgiving and a brilliant home for tired vegetables.',
      steps: [
        { title: 'Chop', text: `Roughly chop ${names(base)} — no need to be neat, it all gets blended.`, minutes: 8 },
        { title: 'Soften', text: `Heat 1 tbsp ${butter ? 'butter' : 'oil'} in a pot over medium heat and cook the vegetables 5 minutes, stirring.`, minutes: 5 },
        { title: 'Simmer', text: `Cover with 3–4 cups water (or stock), add ½ tsp salt and simmer 18–20 minutes until everything is very tender.${heat}`, minutes: 20 },
        { title: 'Blend', text: `Blend until smooth (or mash for a rustic texture). ${milk ? `Swirl in a splash of ${lc(milk.name)} for creaminess. ` : ''}Adjust thickness with hot water.`, minutes: 3 },
        { title: 'Serve', text: `${bread ? 'Serve with toasted bread for dipping. ' : ''}${finish ? finish.text : 'Finish with black pepper and a drizzle of oil.'}`, minutes: 1 },
      ],
      uses: [...base, ...(milk ? [milk] : []), ...(bread ? [bread] : []), ...fin],
      staples: ['Cooking oil — 1 tbsp', 'Salt & pepper — to taste', 'Water or stock — 3–4 cups'],
    }
  }

  const remix = (): Draft => {
    const lo = leftovers[0]
    const noun = lc(lo.name.replace('Leftover ', ''))
    return {
      title: `Glow-Up ${cap(noun)}`,
      tagline: 'Yesterday’s leftovers, tonight’s better meal.',
      steps: [
        { title: 'Revive', text: `Reheat the ${noun} in a dry skillet over medium heat, covered, for 4–5 minutes so the base turns crisp rather than soggy.`, minutes: 5 },
        ...(veg4.length ? [{ title: 'Quick topper', text: `Meanwhile, shave ${names(veg4.slice(0, 2))} very thin and toss with oil, salt and a squeeze of acid.`, minutes: 4 }] : []),
        ...(eggs ? [{ title: 'Fry an egg', text: 'Fry an egg sunny-side up until the white is set and the yolk is jammy.', minutes: 3 }] : []),
        { title: 'Stack', text: `Top the ${noun} with the ${veg4.length ? 'fresh topper' : 'toppings'}${eggs ? ' and the egg' : ''}.${heat}`, minutes: 1 },
        { title: 'Serve', text: finish ? finish.text : 'Eat immediately while crisp.', minutes: 1 },
      ],
      uses: [lo, ...veg4.slice(0, 2), ...(eggs ? [eggs] : []), ...fin],
      staples: ['Cooking oil — 1 tsp', 'Salt & pepper — to taste'],
    }
  }

  const fruitDish = (): Draft => {
    const fr = fruits.slice(0, 5)
    const banana = has('banana')
    if (banana && milk && seed % 2 === 1) {
      const others = fr.filter((f) => f.id !== 'banana')
      return {
        title: 'Creamy Banana Smoothie',
        tagline: 'Drink your overripe fruit instead of binning it.',
        steps: [
          { title: 'Prep', text: `Peel and chop ${names([banana, ...others])}${citrus ? ' (remove peel and pips from the citrus)' : ''}.`, minutes: 3 },
          { title: 'Blend', text: `Blend with ${fmt(milk.per * S * 2)} cup ${lc(milk.name)} and a handful of ice for 45 seconds until silky.`, minutes: 2 },
          { title: 'Adjust', text: 'Thin with a splash of water, or add oats to make it a filling breakfast.', minutes: 1 },
          { title: 'Serve', text: 'Pour into tall glasses and drink right away.', minutes: 1 },
        ],
        uses: [banana, milk, ...others],
        staples: ['Ice — a handful'],
      }
    }
    if (seed % 2 === 0 || crunchy.length < 1) {
      return {
        title: `${citrus ? 'Citrus & ' : ''}${tl(crunchy.slice(0, 2)) || 'Orchard'} Fruit Salad`,
        tagline: 'Zero cooking, maximum freshness.',
        steps: [
          { title: 'Wash & cut', text: `Wash all fruit. Cut ${names(fr)} into bite-size pieces; peel and segment any citrus, saving the juice.`, minutes: 8 },
          { title: 'Dress', text: `Combine in a bowl with ${citrus ? 'the saved citrus juice' : 'a squeeze of lemon or a spoon of water'}${st ? ' and a teaspoon of sugar or honey' : ''}. Toss gently.${spicy ? ' Add a pinch of chili-salt for a Mexican-style kick.' : ''}`, minutes: 2 },
          { title: 'Chill', text: 'Rest in the fridge for 10 minutes so the flavours meld.', minutes: 10 },
          { title: 'Serve', text: `${milk ? `Spoon over ${lc(milk.name)} for a creamy breakfast bowl. ` : ''}Eat the same day for best texture.`, minutes: 1 },
        ],
        uses: [...fr, ...(milk ? [milk] : [])],
        staples: st ? ['Honey or sugar — 1 tsp, optional'] : [],
      }
    }
    return {
      title: `Skillet-Caramelised ${tl(crunchy.slice(0, 2))}`,
      tagline: 'Warm, jammy fruit — dessert or breakfast in 10 minutes.',
      steps: [
        { title: 'Slice', text: `Slice ${names(crunchy)} into thick pieces.`, minutes: 4 },
        { title: 'Caramelise', text: `Melt 1 tbsp ${butter ? 'butter' : 'oil'} in a skillet over medium heat. Add the fruit and cook 4–5 minutes per side until golden.${st ? ' Sprinkle with cinnamon and a little sugar.' : ''}`, minutes: 9 },
        { title: 'Brighten', text: citrus ? `Squeeze in the ${lc(citrus.name)} juice and bubble for 1 minute.` : 'Add a splash of water to make a quick syrup.', minutes: 1 },
        { title: 'Serve', text: `${milk ? `Serve over ${lc(milk.name)}. ` : ''}Serve warm.`, minutes: 1 },
      ],
      uses: [...fr, ...(butter ? [butter] : []), ...(milk ? [milk] : [])],
      staples: st ? ['Cinnamon & sugar — to taste'] : [],
    }
  }

  /* ---- choose a dish (seed rotates through the sensible options) ---- */
  const hasCore = vegs.length > 0 || proteins.length > 0
  const cands: (() => Draft)[] = []
  if (rice && (hasCore || eggs)) cands.push(friedRice)
  if (pasta && hasCore) cands.push(pastaToss)
  if (eggs) cands.push(frittata)
  if (bread && (hasCore || eggs)) cands.push(toastWrap)
  if (vegs.length && !protein) cands.push(roast)
  if (hasCore) cands.push(skillet)
  if (vegs.length >= 2 && !quick) cands.push(soup)
  if (vegs.length && protein) cands.push(roast)
  if (leftovers.length) cands.push(remix)
  if (fruits.length) cands.push(fruitDish)

  if (!cands.length) return emptyRecipe(all.length, S, skipped)
  const d = cands[seed % cands.length]()

  const uniq = Array.from(new Map(d.uses.map((u) => [u.id, u])).values())
  const ingredients = [
    ...uniq.map((u) => ({
      item: u.name,
      amount: u.cat === 'misc' ? 'as needed' : `${fmt(u.per * S)}${u.unit ? ' ' + u.unit : ''}`.trim(),
      have: true,
    })),
    ...d.staples.map((s) => {
      const [item, amount] = s.split(' — ')
      return { item, amount: amount ?? '', have: false }
    }),
  ]
  const minutes = d.steps.reduce((a, s) => a + (s.minutes ?? 0), 0)
  const tipItem = uniq.find((u) => u.tip)
  void dairy
  return {
    id: uid(),
    title: d.title.replace(/\s+/g, ' ').trim(),
    tagline: d.tagline,
    minutes,
    servings: S,
    difficulty: d.steps.length > 6 ? 'Medium' : 'Easy',
    ingredients,
    steps: d.steps,
    tip: tipItem?.tip ?? 'Cool leftovers within two hours and store in an airtight container for up to three days.',
    source: 'chef-engine',
    used: uniq.length,
    total: all.length,
    skipped,
    createdAt: Date.now(),
  }
}

function emptyRecipe(total: number, S: number, skipped: string[]): Recipe {
  return {
    id: uid(),
    title: 'Add a few more ingredients',
    tagline: 'We need a vegetable, protein, carb or fruit to build a dish around.',
    minutes: 0,
    servings: S,
    difficulty: 'Easy',
    ingredients: [],
    steps: [{ title: 'Add more', text: 'Add a few more ingredients using the quick-add chips, then generate again.' }],
    tip: '',
    source: 'chef-engine',
    used: 0,
    total,
    skipped,
    createdAt: Date.now(),
  }
}
