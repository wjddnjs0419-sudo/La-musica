import type { Metadata } from "next";

import ContactPage from "@/components/contact-page";

export const metadata: Metadata = {
  title: "Contact - La Musica",
  description:
    "Contact La Musica for product questions, account support, collaboration ideas, and feedback.",
};

export default function Page() {
  return <ContactPage />;
}
