import { redirect } from "next/navigation";

// No marketing page yet: send visitors straight into the studio.
export default function Home() {
  redirect("/studio");
}
