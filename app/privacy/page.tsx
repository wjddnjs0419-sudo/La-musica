import type { Metadata } from "next";
import LegalPage from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy · La Musica",
  description:
    "How La Musica collects, uses, stores, and shares your information.",
};

const CONTACT_EMAIL = "wjddnjs0419@hufs.ac.kr";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updatedAt="June 13, 2026"
      intro="La Musica (the “Service”) provides an AI music generation service and takes your privacy seriously. This policy explains what information we collect and how we use, store, and share it."
    >
      <section>
        <h2>1. Information We Collect</h2>
        <p>The Service collects the following information.</p>
        <ul>
          <li>
            <strong>Account information</strong>: the email address and
            authentication identifiers provided when you sign up with email or
            log in with a Google account.
          </li>
          <li>
            <strong>Generated content</strong>: the prompts, lyrics, style, and
            duration settings you submit to generate music, and the audio files
            produced.
          </li>
          <li>
            <strong>Payment information</strong>: transaction records processed
            through our payment provider (Stripe) when you purchase credits. The
            Service does not directly store sensitive payment details such as
            card numbers.
          </li>
          <li>
            <strong>Usage data</strong>: activity data needed to operate the
            Service, such as generation history and credit balance.
          </li>
        </ul>
      </section>

      <section>
        <h2>2. How We Use Information</h2>
        <ul>
          <li>Account authentication and management</li>
          <li>Processing AI music generation requests and storing the results</li>
          <li>Handling transactions such as credit purchases and refunds</li>
          <li>Operating the Service, resolving errors, and improving quality</li>
        </ul>
      </section>

      <section>
        <h2>3. Processors and Third Parties</h2>
        <p>
          To operate smoothly, the Service relies on the providers below. Each
          provider is governed by its own privacy policy.
        </p>
        <ul>
          <li>
            <strong>InsForge</strong>: backend infrastructure for
            authentication, database, and audio file storage.
          </li>
          <li>
            <strong>Replicate</strong>: runs the AI music generation model
            (receives prompts and lyrics).
          </li>
          <li>
            <strong>Google</strong>: social login based on Google accounts.
          </li>
          <li>
            <strong>Stripe</strong>: credit payment processing.
          </li>
        </ul>
        <p>
          Except for the cases above, we do not share your personal information
          with outside parties unless required by law or with your consent.
        </p>
      </section>

      <section>
        <h2>4. Retention and Deletion</h2>
        <p>
          Personal information is deleted without delay once its purpose is
          fulfilled or when you request account deletion, except where
          applicable law requires records (such as transaction history) to be
          retained for a set period. Generated audio is removed when you delete
          it or when your account is deleted.
        </p>
      </section>

      <section>
        <h2>5. Your Rights</h2>
        <p>
          You may request access to, correction of, deletion of, or suspension
          of processing of your personal information at any time, and you may
          withdraw consent by deleting your account.
        </p>
      </section>

      <section>
        <h2>6. Security</h2>
        <p>
          The Service applies reasonable technical and organizational
          safeguards, including access control (RLS) and encryption in transit.
          However, no method of transmission over the internet can be
          guaranteed to be completely secure.
        </p>
      </section>

      <section>
        <h2>7. Contact</h2>
        <p>
          For privacy-related inquiries, please contact{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
