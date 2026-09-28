import { createFileRoute } from "@tanstack/react-router";
import { PancakeGame } from "@/components/pancake-game";

export const Route = createFileRoute("/pancakes")({ component: PancakeGame });
