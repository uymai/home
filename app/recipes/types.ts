export interface RecipeMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Recipe {
  title: string;
  description: string;
  prepTime: string;
  cookTime: string;
  servings: number;
  difficulty: string;
  tags: string[];
  ingredients: string[];
  instructions: string[];
  notes?: string;
  macros: RecipeMacros;
}
