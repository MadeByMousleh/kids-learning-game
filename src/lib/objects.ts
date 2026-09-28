export type EverydayObject = {
  id: string;
  name: string;
  image: string;
  praise: string;
};

export const EVERYDAY_OBJECTS: EverydayObject[] = [
  { id: "ball", name: "ball", image: "/objects/ball.jpg", praise: "Yes! Ball." },
  { id: "fork", name: "fork", image: "/objects/fork.jpg", praise: "Yes! Fork." },
  { id: "spoon", name: "spoon", image: "/objects/spoon.jpg", praise: "Yes! Spoon." },
  { id: "shoe", name: "shoe", image: "/objects/shoe.jpg", praise: "Yes! Shoe." },
  { id: "cup", name: "cup", image: "/objects/cup.jpg", praise: "Yes! Cup." },
  { id: "apple", name: "apple", image: "/objects/apple.jpg", praise: "Yes! Apple." },
  { id: "banana", name: "banana", image: "/objects/banana.jpg", praise: "Yes! Banana." },
  { id: "car", name: "car", image: "/objects/car.jpg", praise: "Yes! Car." },
  { id: "cat", name: "cat", image: "/objects/cat.jpg", praise: "Yes! Cat." },
  { id: "dog", name: "dog", image: "/objects/dog.jpg", praise: "Yes! Dog." },
  { id: "book", name: "book", image: "/objects/book.jpg", praise: "Yes! Book." },
  { id: "flower", name: "flower", image: "/objects/flower.jpg", praise: "Yes! Flower." },
];

export function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function choicesFor(targetId: string, pool: EverydayObject[] = EVERYDAY_OBJECTS): EverydayObject[] {
  const target = pool.find((item) => item.id === targetId);
  if (!target) return pool.slice(0, 3);
  const others = shuffle(pool.filter((item) => item.id !== targetId)).slice(0, 2);
  return shuffle([target, ...others]);
}
