import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

const updatedAt = "April 23, 2026";

export default function PrivacyPolicy() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      summary="This policy explains what ThinkDesk collects, how it uses connected Google and Gmail data, and the controls available to every user."
      updatedAt={updatedAt}
    >
      <Section
        title="Overview"
        body="ThinkDesk is a productivity workspace that helps users sign in, manage workspaces, and optionally connect Gmail for inbox sync, organization, and user-directed actions. This policy applies to the ThinkDesk website, application, and related support workflows."
      />

      <Section
        title="Information We Collect"
        body="ThinkDesk may collect account details such as name, email address, authentication identifiers, and workspace preferences. If a user connects Gmail through Google OAuth, ThinkDesk may access message content, message metadata, labels, and related account settings only to provide inbox sync and email productivity features."
      />

      <Section
        title="How We Use Information"
        body="We use account and Gmail information to authenticate users, sync inboxes, categorize or prioritize messages, display email content inside the workspace, support user-requested drafts or sending actions, and improve reliability and security. ThinkDesk does not sell personal information or use Gmail data for advertising."
      />

      <Section
        title="Google API Data"
        body="ThinkDesk's use of Google user data is limited to providing or improving user-facing features inside the app. Google API data is not used to develop, improve, or train generalized AI or machine learning models. ThinkDesk's use and transfer of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements."
      />

      <Section
        title="Storage and Sharing"
        body="ThinkDesk stores application data using Appwrite and related infrastructure providers needed to operate the service. Data is shared only with service providers that help deliver hosting, authentication, storage, support, security, or requested email functionality. We do not share Gmail data with third parties for independent marketing purposes."
      />

      <Section
        title="Retention and Deletion"
        body="Data is retained only as long as reasonably needed to operate the service, comply with legal obligations, resolve disputes, or enforce agreements. Users can disconnect Google access from their Google Account permissions page, request account deletion, or contact us for support with data removal."
      />

      <Section
        title="Security"
        body="We use reasonable administrative, technical, and organizational measures to protect account information and connected email data. No method of storage or transmission is completely secure, so we cannot guarantee absolute security."
      />

      <Section
        title="Contact"
        body="Questions, access requests, or deletion requests can be sent to canbehumanagain@gmail.com."
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
