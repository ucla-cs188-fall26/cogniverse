import type {Evidence,LLMNode,LLMEdge,LLMResult} from '../../types';

type TopicDemo={id:string;title:string;question:string;result:LLMResult};
const node=(id:string,label:string,summary:string,source:Evidence['source'],quote:string):LLMNode=>({id,label,summary,quote,evidence:{source,quote}});
const edge=(source:string,target:string,relationship:string,quote:string):LLMEdge=>({source,target,relationship,evidence:{source:'assistant',quote}});

export const topicFixtures:TopicDemo[]=[
 {
  id:'burger',title:'Make a burger',question:'How to make a burger',
  result:{
   primaryTopicId:'make-a-burger',
   chatResponse:'Make a burger (2 servings)\n\nIngredients\n• 300 g ground beef\n• 2 burger buns\n• 2 slices of cheese, optional\n• Lettuce, sliced tomato, and pickles\n• Salt and pepper\n• A little oil\n• Ketchup or mustard, to taste\n\nSteps\n1. Divide the beef into two patties. Handle it gently and make the patties slightly wider than the buns.\n2. Season both sides with salt and pepper.\n3. Heat a lightly oiled skillet over medium-high heat. Add the patties and cook on both sides until the center reaches 160°F (71°C), checking with a food thermometer.\n4. If using cheese, add it near the end of cooking.\n5. Toast the buns, add sauce and vegetables, then add the cooked patties. Serve immediately.\n\nTips\nAvoid pressing down on the patties while cooking. Keep raw meat and its utensils separate from ready-to-eat toppings. Optional toppings can be explored in a follow-up question.',
   nodes:[node('make-a-burger','Make a burger','A complete burger recipe with ingredients, steps, and tips.','user','How to make a burger')],edges:[],
  },
 },
 {
  id:'spaghetti',title:'Make spaghetti',question:'How do I make spaghetti?',
  result:{
   primaryTopicId:'make-spaghetti',
   chatResponse:'Make spaghetti (2 servings)\n\nIngredients\n• 200 g dried spaghetti\n• 1 tablespoon olive oil\n• 2 garlic cloves, finely chopped\n• 400 g canned chopped tomatoes\n• Salt and pepper\n• Basil and grated cheese, optional\n\nSteps\n1. Bring a large pot of water to a boil and salt it.\n2. Warm the oil in a skillet. Gently cook the garlic until fragrant without burning it.\n3. Add the tomatoes and simmer while the pasta cooks. Season to taste.\n4. Cook the spaghetti according to the package instructions until al dente. Reserve a cup of pasta water before draining.\n5. Toss the spaghetti with the sauce, adding a little reserved water as needed.\n6. Serve with basil and cheese if desired.',
   nodes:[node('make-spaghetti','Make spaghetti','A separate pasta recipe with ingredients and steps.','user','make spaghetti')],edges:[],
  },
 },
 {
  id:'onions',title:'Caramelize onions',question:'How do I caramelize onions for my burger?',
  result:{
   primaryTopicId:'caramelize-onions',
   chatResponse:'Caramelize onions\n\nIngredients\n• 2 medium onions, thinly sliced\n• 1 tablespoon oil or butter\n• A pinch of salt\n• A splash of water as needed\n\nSteps\n1. Warm the oil or butter in a wide skillet over medium-low heat.\n2. Add the onions and salt. Stir to coat.\n3. Cook gently, stirring regularly, until the onions are soft and deeply golden. This often takes 30–45 minutes; use their color and flavor as your guide.\n4. If the pan starts to scorch, reduce the heat and stir in a small splash of water.\n5. Taste and adjust the seasoning.\n\nCaramelized onions are an optional topping for a burger. Add a spoonful when assembling it. Keep the heat gentle: browning quickly over high heat will not produce the same result.',
   nodes:[
    node('caramelize-onions','Caramelize onions','A slow-cooked onion topping, with ingredients and step-by-step instructions.','user','caramelize onions'),
    node('make-a-burger','Make a burger','The burger that the onion topping complements.','assistant','Caramelized onions are an optional topping for a burger.'),
   ],edges:[edge('caramelize-onions','make-a-burger','optional_topping_for','Caramelized onions are an optional topping for a burger.')],
  },
 },
 {
  id:'python',title:'Coding: async/await',question:'Explain async and await in Python with an example',
  result:{
   primaryTopicId:'python-async-await',
   chatResponse:'Python async/await\n\nUse async def to define a coroutine and await to pause it while waiting for an asynchronous operation. An event loop can run other scheduled work during the wait.\n\nExample\n\nimport asyncio\n\nasync def greet():\n    await asyncio.sleep(1)\n    print("Hello")\n\nasyncio.run(greet())\n\nHere, greet pauses at asyncio.sleep rather than blocking the event loop. After one second it resumes and prints Hello.\n\nThis is useful for I/O tasks such as network requests. It does not automatically make CPU-heavy work faster. You must use asynchronous operations inside the coroutine to get cooperative concurrency.',
   nodes:[node('python-async-await','Understand Python async/await','An explanation with a runnable Python example and notes on when to use it.','user','async and await in Python')],edges:[],
  },
 },
 {
  id:'basketball',title:'Sports: zone defense',question:'How does zone defense work in basketball?',
  result:{
   primaryTopicId:'zone-defense',
   chatResponse:'Understand zone defense\n\nIn basketball, zone defense assigns defenders to court areas rather than permanently assigning each defender to one opponent.\n\nHow it works\n• Defenders move together as the ball changes position.\n• They communicate about opponents entering or leaving their area.\n• They protect gaps between neighboring areas and rotate to contest shots.\n\nExample\nIn a 2–3 zone, two defenders begin near the perimeter and three closer to the basket. These are starting positions, not fixed spots: everyone adjusts to the ball and offensive movement.\n\nTrade-offs\nA zone can help protect the paint, but slow rotations can leave outside shooters open. Success depends on communication and coordinated movement.',
   nodes:[node('zone-defense','Understand zone defense','How a basketball zone defense works, with an example and trade-offs.','user','zone defense')],edges:[],
  },
 },
];
