export type Cat = 'protein' | 'veg' | 'carb' | 'dairy' | 'fruit' | 'leftover' | 'misc'

export interface Ingredient {
  id: string
  name: string
  emoji: string
  cat: Cat
  /** meat or fish */
  meat?: boolean
  /** eggs & dairy */
  animal?: boolean
  /** needs longer to cook */
  firm?: boolean
  citrus?: boolean
  /** quantity per serving */
  per: number
  unit: string
  tip?: string
  alias?: string[]
}

export interface PantryItem {
  id: string
  name: string
  emoji: string
  cat: Cat
  count: number
  selected: boolean
  source: 'photo' | 'manual'
  conf?: number
  boxLabel?: string
  addedAt: number
}

export const INGREDIENTS: Ingredient[] = [
  // proteins
  { id: 'egg', name: 'Eggs', emoji: '🥚', cat: 'protein', animal: true, per: 2, unit: '', alias: ['egg', 'eggs'] },
  { id: 'chicken', name: 'Chicken', emoji: '🍗', cat: 'protein', meat: true, per: 120, unit: 'g' },
  { id: 'beef', name: 'Beef', emoji: '🥩', cat: 'protein', meat: true, per: 120, unit: 'g', alias: ['steak', 'ground beef', 'mince'] },
  { id: 'fish', name: 'Fish', emoji: '🐟', cat: 'protein', meat: true, per: 130, unit: 'g', alias: ['salmon', 'tuna', 'cod'] },
  { id: 'shrimp', name: 'Shrimp', emoji: '🍤', cat: 'protein', meat: true, per: 100, unit: 'g', alias: ['prawn', 'prawns'] },
  { id: 'sausage', name: 'Sausage', emoji: '🌭', cat: 'protein', meat: true, per: 1, unit: '', alias: ['hot dog', 'sausages', 'hotdog'] },
  { id: 'bacon', name: 'Bacon', emoji: '🥓', cat: 'protein', meat: true, per: 2, unit: 'strips' },
  { id: 'tofu', name: 'Tofu', emoji: '🧈', cat: 'protein', per: 100, unit: 'g' },
  { id: 'beans', name: 'Beans', emoji: '🫘', cat: 'protein', per: 0.5, unit: 'cup', alias: ['chickpeas', 'lentils', 'black beans'] },
  // vegetables
  { id: 'carrot', name: 'Carrots', emoji: '🥕', cat: 'veg', firm: true, per: 1, unit: 'medium', tip: 'Carrot tops are edible — blitz them into a quick herby pesto.', alias: ['carrot', 'carrots'] },
  { id: 'broccoli', name: 'Broccoli', emoji: '🥦', cat: 'veg', firm: true, per: 0.5, unit: 'head', tip: 'Peel the tough broccoli stems and slice them in — they are sweet and crunchy.' },
  { id: 'potato', name: 'Potatoes', emoji: '🥔', cat: 'veg', firm: true, per: 1, unit: 'medium', alias: ['potato', 'potatoes'] },
  { id: 'onion', name: 'Onion', emoji: '🧅', cat: 'veg', per: 0.5, unit: 'medium', alias: ['onions', 'shallot', 'shallots'] },
  { id: 'garlic', name: 'Garlic', emoji: '🧄', cat: 'veg', per: 1, unit: 'clove', alias: ['garlics'] },
  { id: 'tomato', name: 'Tomatoes', emoji: '🍅', cat: 'veg', per: 1, unit: 'medium', tip: 'Overripe tomatoes are perfect for sauces — never toss a soft one.', alias: ['tomato', 'tomatoes'] },
  { id: 'pepper', name: 'Bell pepper', emoji: '🫑', cat: 'veg', per: 0.5, unit: '', alias: ['peppers', 'bell peppers', 'capsicum', 'chili', 'chilli'] },
  { id: 'spinach', name: 'Spinach', emoji: '🥬', cat: 'veg', per: 1, unit: 'large handful', tip: 'Wilting greens? Cook them down — they shrink and taste great.', alias: ['kale', 'greens', 'salad greens'] },
  { id: 'lettuce', name: 'Lettuce', emoji: '🥬', cat: 'veg', per: 1, unit: 'cup, torn' },
  { id: 'cabbage', name: 'Cabbage', emoji: '🥬', cat: 'veg', firm: true, per: 1, unit: 'cup, shredded' },
  { id: 'cucumber', name: 'Cucumber', emoji: '🥒', cat: 'veg', per: 0.5, unit: '', alias: ['cucumbers'] },
  { id: 'mushroom', name: 'Mushrooms', emoji: '🍄', cat: 'veg', per: 60, unit: 'g', alias: ['mushroom', 'mushrooms'] },
  { id: 'zucchini', name: 'Zucchini', emoji: '🥒', cat: 'veg', per: 0.5, unit: '', alias: ['courgette'] },
  { id: 'corn', name: 'Corn', emoji: '🌽', cat: 'veg', firm: true, per: 0.5, unit: 'cob', alias: ['sweetcorn'] },
  { id: 'eggplant', name: 'Eggplant', emoji: '🍆', cat: 'veg', firm: true, per: 0.5, unit: 'medium', alias: ['aubergine', 'brinjal'] },
  { id: 'celery', name: 'Celery', emoji: '🥬', cat: 'veg', firm: true, per: 1, unit: 'stalk' },
  { id: 'peas', name: 'Peas', emoji: '🫛', cat: 'veg', per: 0.25, unit: 'cup', alias: ['green peas'] },
  // carbs
  { id: 'rice', name: 'Rice', emoji: '🍚', cat: 'carb', per: 0.5, unit: 'cup, uncooked' },
  { id: 'pasta', name: 'Pasta', emoji: '🍝', cat: 'carb', per: 85, unit: 'g', alias: ['spaghetti', 'penne', 'macaroni', 'fusilli'] },
  { id: 'noodles', name: 'Noodles', emoji: '🍜', cat: 'carb', per: 80, unit: 'g', alias: ['ramen', 'udon'] },
  { id: 'bread', name: 'Bread', emoji: '🍞', cat: 'carb', per: 2, unit: 'slices', tip: 'Stale bread makes the best croutons and French toast.', alias: ['toast', 'bun', 'buns', 'loaf'] },
  { id: 'tortilla', name: 'Tortillas', emoji: '🫓', cat: 'carb', per: 2, unit: '', alias: ['tortilla', 'wrap', 'wraps', 'pita'] },
  { id: 'oats', name: 'Oats', emoji: '🌾', cat: 'carb', per: 0.5, unit: 'cup', alias: ['oatmeal'] },
  // dairy
  { id: 'milk', name: 'Milk', emoji: '🥛', cat: 'dairy', animal: true, per: 0.5, unit: 'cup' },
  { id: 'cheese', name: 'Cheese', emoji: '🧀', cat: 'dairy', animal: true, per: 30, unit: 'g', alias: ['cheddar', 'mozzarella', 'parmesan'] },
  { id: 'yogurt', name: 'Yogurt', emoji: '🥣', cat: 'dairy', animal: true, per: 0.5, unit: 'cup', alias: ['yoghurt', 'curd'] },
  { id: 'butter', name: 'Butter', emoji: '🧈', cat: 'dairy', animal: true, per: 1, unit: 'tbsp', alias: ['oil', 'olive oil'] },
  // fruit
  { id: 'apple', name: 'Apples', emoji: '🍎', cat: 'fruit', per: 0.5, unit: '', tip: 'Soft apples are ideal for cooking — slice and sauté with a little cinnamon.', alias: ['apple', 'apples'] },
  { id: 'banana', name: 'Bananas', emoji: '🍌', cat: 'fruit', per: 1, unit: '', tip: 'Brown bananas are sweeter — great for pancakes, smoothies or baking.', alias: ['banana', 'bananas'] },
  { id: 'orange', name: 'Oranges', emoji: '🍊', cat: 'fruit', citrus: true, per: 1, unit: '', tip: 'Zest the orange peel before juicing and freeze it for later.', alias: ['orange', 'oranges', 'mandarin', 'tangerine'] },
  { id: 'lemon', name: 'Lemon', emoji: '🍋', cat: 'fruit', citrus: true, per: 0.5, unit: '', alias: ['lemons', 'lime', 'limes'] },
  { id: 'avocado', name: 'Avocado', emoji: '🥑', cat: 'fruit', per: 0.5, unit: '', alias: ['avocados'] },
  { id: 'strawberry', name: 'Strawberries', emoji: '🍓', cat: 'fruit', per: 0.5, unit: 'cup', alias: ['strawberry', 'strawberries', 'berries', 'blueberries'] },
  { id: 'grapes', name: 'Grapes', emoji: '🍇', cat: 'fruit', per: 0.5, unit: 'cup', alias: ['grape'] },
  { id: 'pear', name: 'Pears', emoji: '🍐', cat: 'fruit', per: 0.5, unit: '', alias: ['pear', 'pears'] },
  { id: 'pineapple', name: 'Pineapple', emoji: '🍍', cat: 'fruit', per: 0.5, unit: 'cup, chunks' },
  { id: 'mango', name: 'Mango', emoji: '🥭', cat: 'fruit', per: 0.5, unit: '', alias: ['mangoes'] },
  // leftovers / ready foods
  { id: 'pizza', name: 'Leftover pizza', emoji: '🍕', cat: 'leftover', animal: true, meat: true, per: 2, unit: 'slices', alias: ['pizza'] },
  { id: 'sandwich', name: 'Leftover sandwich', emoji: '🥪', cat: 'leftover', animal: true, meat: true, per: 1, unit: '', alias: ['sandwich'] },
  { id: 'donut', name: 'Donuts', emoji: '🍩', cat: 'leftover', animal: true, per: 1, unit: '', alias: ['donut', 'doughnut'] },
  { id: 'cake', name: 'Cake', emoji: '🍰', cat: 'leftover', animal: true, per: 1, unit: 'slice' },
]

export const byId = (id: string) => INGREDIENTS.find((i) => i.id === id)

/** COCO class id -> ingredient id with kitchen expansions */
export const COCO_FOOD: Record<number, string> = {
  39: 'milk',     // bottle -> refined by color to milk, cooking oil, sauce
  41: 'yogurt',   // cup -> dairy / beverage
  45: 'rice',     // bowl -> grains, salad, soup
  46: 'banana',
  47: 'apple',    // refined by color to tomato / apple / lemon
  48: 'sandwich',
  49: 'orange',   // refined by color to lemon / orange / tomato / pepper
  50: 'broccoli',
  51: 'carrot',
  52: 'sausage',
  53: 'pizza',
  54: 'donut',
  55: 'cake',
}

export const QUICK_ADD = [
  'egg', 'milk', 'cheese', 'rice', 'pasta', 'onion', 'garlic', 'tomato', 'potato', 'pepper',
  'spinach', 'chicken', 'tofu', 'bread', 'yogurt', 'mushroom', 'cucumber', 'lemon', 'beans', 'butter',
]

export const CATEGORIES: { id: Cat | 'all'; label: string; emoji: string }[] = [
  { id: 'all', label: 'All', emoji: '🧺' },
  { id: 'veg', label: 'Vegetables', emoji: '🥦' },
  { id: 'protein', label: 'Proteins', emoji: '🥩' },
  { id: 'carb', label: 'Carbs & Grains', emoji: '🌾' },
  { id: 'dairy', label: 'Dairy & Eggs', emoji: '🧀' },
  { id: 'fruit', label: 'Fruits', emoji: '🍎' },
  { id: 'leftover', label: 'Leftovers', emoji: '🍕' },
]

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

export function resolveIngredient(text: string): Ingredient | null {
  const t = norm(text)
  if (!t) return null
  const singular = t.endsWith('es') ? t.slice(0, -2) : t.endsWith('s') ? t.slice(0, -1) : t
  for (const i of INGREDIENTS) {
    const names = [i.id, i.name.toLowerCase(), ...(i.alias ?? [])].map(norm)
    if (names.includes(t) || names.includes(singular) || names.includes(t + 's')) return i
  }
  const clean = t.replace(/[^a-z0-9 \-']/g, '').slice(0, 28)
  if (!clean) return null
  return {
    id: 'custom:' + clean,
    name: clean.charAt(0).toUpperCase() + clean.slice(1),
    emoji: '🍽️',
    cat: 'misc',
    per: 1,
    unit: 'portion',
  }
}

export function parseMultipleIngredients(input: string): Ingredient[] {
  const parts = input.split(/[,;\n+]+/).map((s) => s.trim()).filter(Boolean)
  const results: Ingredient[] = []
  const seen = new Set<string>()
  for (const part of parts) {
    const ing = resolveIngredient(part)
    if (ing && !seen.has(ing.id)) {
      seen.add(ing.id)
      results.push(ing)
    }
  }
  return results
}

export const PANTRY_KEY = 'snapchef:pantry:v2'

export function loadPantry(): PantryItem[] {
  try {
    const raw = localStorage.getItem(PANTRY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as PantryItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function savePantry(items: PantryItem[]): void {
  try {
    localStorage.setItem(PANTRY_KEY, JSON.stringify(items))
  } catch {
    /* storage full or disabled */
  }
}

export const tone = ['#E8412A', '#2F7D4F', '#D98A00', '#3B6FD4', '#B6458F', '#0F8C8C']
export function colorFor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return tone[h % tone.length]
}