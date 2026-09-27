import { createFileRoute } from "@tanstack/react-router";
import { ObjectsGame } from "@/components/objects-game";

export const Route = createFileRoute("/objects")({ component: ObjectsGame });
