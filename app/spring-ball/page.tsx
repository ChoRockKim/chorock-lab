import type { Metadata } from "next";
import BackToLab from "@/components/BackToLab";
import { getExperiment } from "@/lib/experiments";
import SpringBall from "./SpringBall";

const experiment = getExperiment("spring-ball");

export const metadata: Metadata = {
  title: experiment.title,
  description: experiment.summary,
};

export default function Page() {
  return (
    <>
      <BackToLab />
      <SpringBall />
    </>
  );
}
