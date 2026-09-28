import { createFileRoute } from "@tanstack/react-router";
import { PaintGame } from "@/components/paint-game";

export const Route = createFileRoute("/paint")({ component: PaintGame });
