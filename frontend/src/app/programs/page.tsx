import { Metadata } from "next";
import BrowsePrograms from "./ProgramsClient";

export const metadata: Metadata = {
  title: "Browse Government Benefit Programs & Schemes",
  description:
    "Search and filter through 200+ federal, state, and county benefit programs. Find estimated values, eligibility criteria, and instructions to apply.",
};

export default function ProgramsPage() {
  return <BrowsePrograms />;
}
