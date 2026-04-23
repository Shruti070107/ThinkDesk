import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

const updatedAt = "April 23, 2026";

export default function TermsOfService() {
  return (
    <LegalPageLayout
      title="Terms of Service"
      summary="These terms govern access to ThinkDesk, including account use, Gmail integrations, and responsibilities when using AI-assisted productivity features."
      updatedAt={updatedAt}
    >
      <Section
        title="Acceptance of Terms"
        body="By accessing or using ThinkDesk, you agree to these Terms of Service and the Privacy Policy. If you do not agree, do not use the service."
      />

      <Section
        title="Accounts"
        body="You are responsible for maintaining the confidentiality of your account credentials and for activity that occurs through your account. You must provide accurate information and use the service in compliance with applicable law."
      />

      <Section
        title="Permitted Use"
        body="ThinkDesk is provided for email productivity, organization, planning, and workspace support. You may not use the service to violate laws, infringe rights, distribute harmful content, abuse third-party services, or interfere with the operation or security of the platform."
      />

      <Section
        title="Google and Gmail Integrations"
        body="If you connect Google or Gmail, you authorize ThinkDesk to access the scopes you approve in order to sync messages, display email content, organize mail, and perform user-directed email actions. You remain responsible for reviewing drafts, recipients, and message content before sending."
      />

      <Section
        title="AI-Assisted Features"
        body="ThinkDesk may provide automated categorization, summaries, drafts, and recommendations. These features are assistive only and may be incomplete or inaccurate. You are responsible for your final decisions and any communications sent through your account."
      />

      <Section
        title="Availability and Changes"
        body="We may update, suspend, or discontinue parts of ThinkDesk at any time, including integrations, features, or limits. We do not guarantee uninterrupted availability."
      />

      <Section
        title="Termination"
        body="We may suspend or terminate access if these terms are violated, if required by law, or if use of the service creates risk for users, providers, or the platform. You may stop using the service at any time."
      />

      <Section
        title="Disclaimers and Limitation of Liability"
        body="ThinkDesk is provided on an as-is and as-available basis to the maximum extent permitted by law. We disclaim warranties of merchantability, fitness for a particular purpose, and non-infringement. To the extent permitted by law, ThinkDesk will not be liable for indirect, incidental, special, consequential, or punitive damages arising from use of the service."
      />

      <Section
        title="Contact"
        body="Questions about these terms can be sent to canbehumanagain@gmail.com."
      />
    </LegalPageLayout>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <p className="text-sm leading-7 text-slate-300 md:text-base">{body}</p>
    </section>
  );
}
