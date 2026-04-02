export default function TermsOfService() {
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms of Service</h1>
          <p className="text-slate-500 text-sm">Last updated: April 2, 2026</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-8 text-slate-700 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">1. Acceptance of Terms</h2>
            <p>By accessing or using AgencyOS ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform. These terms apply to all users, including agency staff and administrators.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">2. Description of Service</h2>
            <p>AgencyOS is an internal agency management platform designed for use by authorized agency personnel. It provides tools for client management, SEO reporting, PPC tracking, lead tracking, content creation, and integration with third-party platforms including Google and GoHighLevel (GHL).</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">3. Authorized Use</h2>
            <p>Access to the Platform is restricted to authorized agency employees and contractors who have been granted access by an administrator. You agree to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Keep your login credentials confidential</li>
              <li>Not share access with unauthorized individuals</li>
              <li>Use the Platform solely for legitimate agency business purposes</li>
              <li>Not attempt to reverse engineer, copy, or redistribute the Platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">4. Client Data</h2>
            <p>The Platform stores and processes data belonging to the agency's clients. All users are responsible for handling client data in accordance with applicable privacy laws and the agency's internal data handling policies. Client data must not be shared outside the Platform without proper authorization.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">5. Third-Party Integrations</h2>
            <p>The Platform integrates with third-party services including Google Search Console, Google Analytics, Google Ads, and GoHighLevel. Your use of these integrations is also subject to the respective third-party terms of service. We are not responsible for changes, outages, or limitations imposed by these third-party platforms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">6. Intellectual Property</h2>
            <p>All content, features, and functionality of the Platform are the exclusive property of the agency. Unauthorized reproduction, distribution, or modification of any part of the Platform is strictly prohibited.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">7. Limitation of Liability</h2>
            <p>The Platform is provided "as is." We make no warranties, expressed or implied, regarding accuracy, reliability, or fitness for a particular purpose. We shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">8. Termination</h2>
            <p>Access to the Platform may be revoked at any time by an administrator without notice if a user is found to be in violation of these terms or for any other business reason.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">9. Changes to Terms</h2>
            <p>We reserve the right to update these Terms of Service at any time. Continued use of the Platform after changes are posted constitutes acceptance of the revised terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">10. Contact</h2>
            <p>If you have questions about these Terms of Service, please contact your agency administrator.</p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-slate-200 flex gap-4 text-xs text-slate-400">
          <a href="/privacy-policy" className="hover:text-slate-600 transition-colors">Privacy Policy</a>
          <span>·</span>
          <span>© 2026 AgencyOS. All rights reserved.</span>
        </div>
      </div>
    </div>
  );
}