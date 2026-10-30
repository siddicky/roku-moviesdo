import { HomeScreen } from "@/components/HomeScreen";
import { getHome } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getHome();
  return <HomeScreen data={data} />;
}
