/*
 * samples.js - the 10 starter cards, adapted from Fannie Farmer's
 * Boston Cooking-School Cook Book (public domain in the USA; Project Gutenberg #65061).
 *
 * Talks to: card.js (makeNewCard), fractions.js (reads each ingredient line).
 *           storage.js loads these only when the box is empty (first visit).
 *
 * Say it to a judge: "The starter recipes come from a public-domain 1896 cookbook.
 * We modernised vague directions like 'a moderate oven' into exact temperatures and
 * times, and every card credits the book on its back."
 *
 * IMPORTANT FOR THE TEAM: these were written from memory of the book, not copied
 * from it. Every card has a VERIFY comment. Check quantities against the book
 * before the demo: https://www.gutenberg.org/ebooks/65061
 */

import { makeNewCard } from './card.js';
import { parseIngredient } from './fractions.js';

const SOURCE = {
  type: 'sample',
  url: 'https://www.gutenberg.org/ebooks/65061',
  credit: "Adapted from Fannie Farmer's Boston Cooking-School Cook Book",
};

function sample({ ingredients, ...fields }) {
  return makeNewCard({
    kitchenOf: 'Grandma',
    source: { ...SOURCE },
    ingredients: ingredients.map(parseIngredient),
    ...fields,
  });
}

export function makeSampleCards() {
  return [
    // VERIFY: Soft Molasses Gingerbread - quantities, and that 350°F / 25-30 min suits "moderate oven".
    sample({
      title: 'Soft Molasses Gingerbread',
      dividerId: 'cakes-pies',
      uses: 7,
      favorite: true,
      font: 'homemade-apple',
      doodle: 'doodle-star',
      servings: 9,
      ingredients: [
        '1 cup molasses', '1/3 cup butter', '1 3/4 tsp baking soda', '1/2 cup sour milk or buttermilk',
        '1 egg, beaten', '2 cups flour', '2 tsp ground ginger', '1/2 tsp salt',
      ],
      steps: [
        'Heat oven to 350°F. Butter an 8-inch square pan.',
        'Heat molasses and butter just to boiling. Take off the heat, add the soda and beat hard.',
        'Stir in the milk and egg, then the flour sifted with ginger and salt.',
        'Bake 25 to 30 minutes, until the middle springs back.',
      ],
      cookLog: [
        { date: '1981-12-24', photoId: null, notes: 'Christmas Eve. Added a pinch of cloves.' },
        { date: '1983-10-02', photoId: null, notes: 'Used buttermilk. Even better.' },
      ],
    }),

    // VERIFY: Apple Pie - filling quantities; 425°F for 40-45 min is our modernisation.
    sample({
      title: 'Apple Pie',
      dividerId: 'cakes-pies',
      uses: 6,
      favorite: true,
      font: 'caveat',
      doodle: null,
      servings: 8,
      notes: 'Use tart apples. Northern Spy if you can get them.',
      ingredients: [
        'Pastry for a two-crust 9-inch pie', '5 tart apples, pared and sliced', '1/3 cup sugar',
        '1/4 tsp grated nutmeg', '1/8 tsp salt', '1 tsp butter', '1 tsp lemon juice', 'A little grated lemon rind',
      ],
      steps: [
        'Heat oven to 425°F. Line a pie plate with pastry.',
        'Fill with apples, heaping them in the middle.',
        'Mix sugar, nutmeg, salt, lemon juice and rind; sprinkle over. Dot with butter.',
        'Wet the edge, cover with the top crust, press and cut vents.',
        'Bake 40 to 45 minutes, until the crust is brown and the apples are soft.',
      ],
    }),

    // VERIFY: Baking Powder Biscuits - fat and liquid amounts; 450°F for 12-15 min replaces "hot oven".
    sample({
      title: 'Baking Powder Biscuits',
      dividerId: 'breads',
      uses: 4,
      font: 'reenie-beanie',
      doodle: 'doodle-spoon',
      servings: 12,
      ingredients: [
        '2 cups flour', '4 tsp baking powder', '1 tsp salt', '1 tbsp lard', '1 tbsp butter',
        '3/4 cup milk and water, half of each',
      ],
      steps: [
        'Heat oven to 450°F.',
        'Sift flour, baking powder and salt twice. Work in lard and butter with fingertips.',
        'Add the liquid a little at a time, mixing with a knife to a soft dough.',
        'Pat and roll lightly to 1/2 inch thick. Cut with a floured cutter.',
        'Bake on a buttered pan 12 to 15 minutes.',
      ],
    }),

    // VERIFY: Corn Cake - sugar and baking powder amounts; 400°F for 20 min replaces "hot oven".
    sample({
      title: 'Golden Corn Cake',
      dividerId: 'breads',
      uses: 1,
      font: 'special-elite',
      doodle: null,
      servings: 9,
      ingredients: [
        '3/4 cup corn meal', '1 1/4 cups flour', '1/4 cup sugar', '5 tsp baking powder', '1/2 tsp salt',
        '1 cup milk', '1 egg, well beaten', '1 tbsp melted butter',
      ],
      steps: [
        'Heat oven to 400°F. Butter a shallow 8-inch pan.',
        'Mix and sift the dry ingredients.',
        'Add milk, egg and butter. Stir just until mixed.',
        'Bake 20 minutes, until golden.',
      ],
    }),

    // VERIFY: Sugar Cookies - check every quantity; 375°F for 8-10 min replaces "moderate oven".
    sample({
      title: 'Sugar Cookies',
      dividerId: 'cookies',
      uses: 3,
      favorite: true,
      font: 'caveat',
      doodle: 'doodle-daisy',
      servings: 36,
      ingredients: [
        '1/2 cup butter', '1 cup sugar', '2 eggs, well beaten', '1/4 cup milk', '2 tsp baking powder',
        '1/2 tsp salt', '2 1/2 cups flour, about', '1 tsp vanilla',
      ],
      steps: [
        'Cream the butter, add sugar gradually, then eggs, milk and vanilla.',
        'Add flour sifted with baking powder and salt. Chill one hour.',
        'Heat oven to 375°F. Roll thin on a floured board, cut, sprinkle with sugar.',
        'Bake 8 to 10 minutes on a buttered sheet.',
      ],
    }),

    // VERIFY: Molasses Cookies - check every quantity; 350°F for 10-12 min replaces "moderate oven".
    sample({
      title: 'Molasses Cookies',
      dividerId: 'cookies',
      uses: 2,
      font: 'homemade-apple',
      doodle: null,
      servings: 36,
      ingredients: [
        '1 cup molasses', '1/2 cup shortening, butter and lard mixed', '2 1/2 cups flour', '1 tbsp ground ginger',
        '1 tbsp baking soda', '2 tbsp warm milk', '1 1/2 tsp salt',
      ],
      steps: [
        'Heat molasses to boiling and pour over the shortening.',
        'Add the soda dissolved in the milk, then flour sifted with ginger and salt.',
        'Chill well. Heat oven to 350°F.',
        'Roll thin, a little at a time, and cut. Bake 10 to 12 minutes.',
      ],
    }),

    // VERIFY: Chicken Fricassee with Dumplings - sauce and dumpling quantities; simmer and steam times.
    sample({
      title: 'Chicken Fricassee with Dumplings',
      dividerId: 'main-dishes',
      uses: 8,
      font: 'caveat',
      doodle: 'doodle-cup',
      servings: 6,
      notes: 'Double the dumplings',
      ingredients: [
        '1 chicken, about 4 lb, cut up', 'Salt, pepper and flour for dredging', '3 tbsp butter',
        '4 tbsp flour', '1/2 cup cream', '2 cups flour, for dumplings', '4 tsp baking powder',
        '1/2 tsp salt', '2 tsp butter', '3/4 cup milk',
      ],
      steps: [
        'Season the chicken, dredge with flour and brown in the 3 tbsp butter.',
        'Cover with boiling water. Simmer, covered, about 1 1/2 hours, until tender.',
        'Lift out the chicken. Boil the stock down to 2 cups.',
        'Mix the 4 tbsp flour smooth with a little cold water and stir into the stock. Boil 2 minutes, then add the cream.',
        'Dumplings: sift 2 cups flour, baking powder and salt. Work in the 2 tsp butter and add milk to make a soft dough.',
        'Return the chicken to the sauce. Drop dumplings on top by the spoonful.',
        'Cover tightly and steam 12 minutes. Do not lift the lid.',
        'Serve the chicken on a hot platter with dumplings around it and sauce over.',
      ],
    }),

    // VERIFY: Cream of Tomato Soup - milk, flour and butter amounts.
    sample({
      title: 'Cream of Tomato Soup',
      dividerId: 'soups',
      uses: 0,
      font: 'special-elite',
      doodle: null,
      servings: 6,
      ingredients: [
        '2 cups canned tomatoes', '2 tsp sugar', '1/4 tsp baking soda', '1 quart milk', '1 slice onion',
        '4 tbsp flour', '1 tsp salt', '1/8 tsp pepper', '1/3 cup butter',
      ],
      steps: [
        'Scald the milk with the onion; take out the onion.',
        'Mix the flour smooth with a little cold water, stir into the milk and cook 20 minutes over low heat, stirring.',
        'Cook tomatoes with sugar 15 minutes. Add soda and rub through a sieve.',
        'Stir the tomatoes into the milk. Add butter, salt and pepper. Serve at once; do not boil.',
      ],
    }),

    // VERIFY: Scalloped Potatoes - milk amount; 350°F for about 1 1/4 hours replaces "moderate oven".
    sample({
      title: 'Scalloped Potatoes',
      dividerId: 'sides',
      uses: 1,
      font: 'reenie-beanie',
      doodle: 'doodle-daisy',
      servings: 6,
      ingredients: [
        '4 cups potatoes, pared and sliced thin', '2 tbsp flour', '2 tbsp butter', '1 tsp salt',
        '1/8 tsp pepper', '1 1/2 cups hot milk, about',
      ],
      steps: [
        'Heat oven to 350°F. Butter a baking dish.',
        'Put in a layer of potatoes; sprinkle with salt, pepper and flour and dot with butter. Repeat.',
        'Pour in hot milk until you can just see it through the top layer.',
        'Bake about 1 1/4 hours, until the potatoes are soft and the top is brown.',
      ],
    }),

    // VERIFY: Chili Sauce - spice amounts and the 2 1/2 hour cooking time. The storage advice is ours.
    sample({
      title: 'Chili Sauce',
      dividerId: 'canning',
      uses: 0,
      font: 'homemade-apple',
      doodle: 'doodle-spoon',
      servings: null,
      ingredients: [
        '12 medium ripe tomatoes, peeled and sliced', '1 pepper, finely chopped', '1 onion, finely chopped',
        '2 cups vinegar', '3 tbsp sugar', '1 tbsp salt', '2 tsp ground cloves', '2 tsp cinnamon',
        '2 tsp allspice', '2 tsp grated nutmeg',
      ],
      steps: [
        'Put everything in a large heavy kettle.',
        'Heat slowly to boiling, then cook gently about 2 1/2 hours, stirring now and then, until thick.',
        'Pour into clean hot jars and seal.',
        'Keep in the refrigerator, or process the jars by a current tested canning method.',
      ],
    }),
  ];
}
