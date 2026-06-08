import HowToPlay from "@/components/HowToPlay";

export const metadata = { title: "Reglas · Office Bet Friends" };

export default function ReglasPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Reglas y cómo participar</h2>
      <HowToPlay defaultOpen />
    </div>
  );
}
