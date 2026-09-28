export type ColoringPage = {
  id: string;
  name: string;
  src: string;
};

export const COLORING_PAGES: ColoringPage[] = [
  { id: "cat", name: "Cat", src: "/coloring/cat.png?v=2" },
  { id: "dog", name: "Dog", src: "/coloring/dog.jpg?v=3" },
  { id: "bunny", name: "Bunny", src: "/coloring/bunny.jpg" },
  { id: "bird", name: "Bird", src: "/coloring/bird.jpg" },
  { id: "fish", name: "Fish", src: "/coloring/fish.jpg" },
  { id: "butterfly", name: "Butterfly", src: "/coloring/butterfly.jpg" },
  { id: "flower", name: "Flower", src: "/coloring/flower.jpg" },
  { id: "car", name: "Car", src: "/coloring/car.jpg" },
];

export function coloringUrl(src: string) {
  return src;
}
