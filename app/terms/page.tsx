import type { Metadata } from "next";
import LegalPage from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms for using La Musica, including credits, payments, and content rights.",
  alternates: {
    canonical: "/terms",
  },
};

const CONTACT_EMAIL = "wjddnjs0419@hufs.ac.kr";

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updatedAt="June 13, 2026"
      intro="These terms govern your use of La Musica (the “Service”), including the conditions of use and the rights and obligations of users and the Service. By using the Service, you agree to these terms."
    >
      <section>
        <h2>1. The Service</h2>
        <p>
          The Service generates music through AI models based on the prompts,
          lyrics, and settings you provide, and lets you store, play, and
          download the generated audio.
        </p>
      </section>

      <section>
        <h2>2. Accounts</h2>
        <p>
          You may sign up with an email address or a Google account, and you are
          responsible for the accuracy and security of your account
          information. You may not use another person&apos;s account without
          authorization.
        </p>
      </section>

      <section>
        <h2>3. Credits and Payments</h2>
        <p>
          Generating music consumes credits. Credits can be purchased through
          the plans below, and payments are processed by Stripe.
        </p>
        <ul>
          <li>Starter — $2.99 / 5 songs</li>
          <li>Creator — $7.99 / 20 songs</li>
          <li>Viral Pack — $14.99 / 35 songs</li>
        </ul>
        <p>
          Credits are deducted when you submit a generation request. Credits
          that have been consumed or used for a successfully completed
          generation are non-refundable; where there is a fault attributable to
          the Service, such as a payment error, refunds are handled in
          accordance with applicable law. Plans and prices may change with prior
          notice.
        </p>
      </section>

      <section>
        <h2>4. Content and Rights</h2>
        <p>
          To the extent permitted by applicable law, rights in the prompts and
          lyrics you submit and the audio generated from them belong to you. You
          represent that the content you submit does not infringe the rights of
          any third party.
        </p>
        <p>
          Because of how AI models work, similar results may appear for other
          users, and the Service does not warrant the originality, accuracy, or
          fitness for a particular purpose of any output.
        </p>
      </section>

      <section>
        <h2>5. Prohibited Conduct</h2>
        <ul>
          <li>
            Generating content that infringes copyrights, trademarks, or other
            rights of others
          </li>
          <li>Use for unlawful purposes or to harm others</li>
          <li>
            Interfering with normal operation of the Service or gaining
            unauthorized access to its systems
          </li>
          <li>Abusing the credit or payment systems</li>
        </ul>
      </section>

      <section>
        <h2>6. Limitation of Liability</h2>
        <p>
          The Service is provided “as is” without any warranty of uninterrupted
          or error-free operation. The Service is not liable for damages arising
          from causes beyond its control, such as force majeure or failures of
          external services (AI models, infrastructure, payment providers, and
          the like).
        </p>
      </section>

      <section>
        <h2>7. Changes to These Terms</h2>
        <p>
          The Service may revise these terms as needed, and changes take effect
          when announced within the Service or posted on this page.
        </p>
      </section>

      <section>
        <h2>8. Contact</h2>
        <p>
          For questions about these terms, please contact{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
