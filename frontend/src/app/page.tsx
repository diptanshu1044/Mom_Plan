import dynamic from "next/dynamic";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const LandingPage = dynamic(() => import("@/components/landing/LandingPage"), {
  loading: () => <div className="min-h-screen bg-gradient-hero" />,
});

export default function Home() {
  return (
    <>
      <Navbar />
      <LandingPage />
      <Footer />
    </>
  );
}
