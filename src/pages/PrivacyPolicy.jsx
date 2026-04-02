export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-bold text-slate-800 text-lg">AgencyOS</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
          <p className="text-slate-500 text-sm">Last updated: April 2, 2026</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-8 text-slate-700 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">1. Overview</h2>
            <p>This Privacy Policy describes how AgencyOS ("the Platform") collects, uses, and protects information in connection with its use by authorized agency personnel. We are committed to maintaining the privacy and security of all data processed through the Platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">2. Information We Collect</h2>
            <p>The Platform collects and processes the following types of information:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>User account information</strong> — name, email address, and role within the agency</li>
              <li><strong>Client data</strong> — business names, contact details, performance metrics, and integration credentials entered by agency staff</li>
              <li><strong>Third-party platform data</strong> — data pulled via integrations such as Google Search Console, Google Analytics, Google Ads, and GoHighLevel (opportunities, leads, traffic data)</li>
              <li><strong>Usage data</strong> — actions taken within the Platform for security and audit purposes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">3. How We Use Information</h2>
            <p>Information collected through the Platform is used exclusively to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Provide agency staff with client performance dashboards and reporting tools</li>
              <li>Sync data from connected third-party platforms</li>
              <li>Generate reports and insights for internal agency use</li>
              <li>Maintain the security and proper functioning of the Platform</li>
            </ul>
            <p className="mt-2">We do not sell, rent, or share any data with third parties for marketing or advertising purposes.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">4. Third-Party Integrations</h2>
            <p>The Platform connects to the following third-party services on behalf of authorized users:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Google Search Console</li>
              <li>Google Analytics 4</li>
              <li>Google Ads</li>
              <li>GoHighLevel (GHL)</li>
              <li>WordPress</li>
            </ul>
            <p className="mt-2">Data retrieved from these services is stored within the Platform and is subject to each provider's own privacy policies. API credentials (keys, tokens) are stored securely and used solely to facilitate data retrieval.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">5. Data Storage and Security</h2>
            <p>All data is stored on secure cloud infrastructure. We implement industry-standard security measures including:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Role-based access controls limiting data visibility by user role</li>
              <li>Encrypted transmission of data (HTTPS)</li>
              <li>Secure storage of API credentials and secrets</li>
            </ul>
            <p className="mt-2">Despite these measures, no system is completely immune to security risks. Users are responsible for keeping their own login credentials secure.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">6. Data Retention</h2>
            <p>Client and performance data is retained for as long as the client relationship is active or as required for reporting purposes. Users whose access is revoked will no longer have access to any stored data. Data may be deleted upon formal request to an agency administrator.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">7. Access and Control</h2>
            <p>Authorized users may view and update data within the scope of their assigned role. Administrators have full access to manage, export, or delete data within the Platform. If you have concerns about data stored about you or your clients, contact your agency administrator.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">8. Children's Privacy</h2>
            <p>The Platform is intended solely for use by agency professionals and is not directed toward individuals under 18 years of age. We do not knowingly collect personal information from minors.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">9. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. Changes will be reflected by an updated "Last updated" date at the top of this page. Continued use of the Platform after changes are posted constitutes acceptance of the revised policy.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">10. Contact</h2>
            <p>If you have questions or concerns about this Privacy Policy or how your data is handled, please contact your agency administrator.</p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-slate-200 flex gap-4 text-xs text-slate-400">
          <a href="/terms-of-service" className="hover:text-slate-600 transition-colors">Terms of Service</a>
          <span>·</span>
          <span>© 2026 AgencyOS. All rights reserved.</span>
        </div>
      </div>
    </div>
  );
}