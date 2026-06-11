'use client'

import { Header } from '@/components/header'
import { PriceTicker } from '@/components/price-ticker'
import { Footer } from '@/components/footer'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <PriceTicker />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Notice</h1>
        <p className="text-sm text-muted-foreground mb-8">Last Updated: 18/05/2026</p>

        <div className="space-y-8 text-muted-foreground">
          <section className="space-y-4">
            <p className="leading-relaxed">
              This &quot;Privacy Notice&quot; describes the privacy practices of leap.fun and its affiliates
              (collectively, &quot;leap.fun&quot;, &quot;our&quot;, &quot;us&quot; or &quot;we&quot;), in connection with the leap.fun website and
              the leap.fun Platform (collectively, &quot;Services&quot;). This Privacy Notice also explains the rights
              and choices available to individuals with respect to their information.
            </p>
            <p className="leading-relaxed">
              Please read this Privacy Notice carefully to understand our policies and practices regarding your
              information. If you do not agree with our policies and practices, please do not use the leap.fun
              Platform. By accessing or using the leap.fun Platform, you acknowledge and agree to the terms of this
              Privacy Notice.
            </p>
            <p className="leading-relaxed">
              We may update this Privacy Notice based upon evolving laws, regulations and industry standards, or as
              we may make changes to the leap.fun Platform. If we make changes that materially alter your privacy
              rights, we will take appropriate measures to inform you, consistent with the significance of the
              changes we make. If you disagree with the changes to this Privacy Notice, you should discontinue your
              access and use of the leap.fun Platform.
            </p>
            <p className="leading-relaxed">
              The leap.fun Platform is not directed to, and we do not knowingly collect Personal Data from, anyone
              under the age of 18. If a parent or guardian becomes aware that their child has provided us with
              information, they should contact us. We will delete such information from our files as soon as
              reasonably practicable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Personal Data Controller</h2>
            <p className="leading-relaxed mb-4">
              The term &quot;Personal Data&quot; as used in this policy describes information that can be associated with a
              specific person and can identify that person. Personal Data does not include information that has been
              aggregated or anonymised so that a specific person can no longer be identified.
            </p>
            <p className="leading-relaxed">
              A Personal Data controller is a person or organisation who controls the collection, holding, processing
              or use of Personal Data, including a person or organisation who instructs another person or organisation
              to collect, hold, process, use, transfer or disclose Personal Data on its behalf. leap.fun acts as the
              Personal Data controller for information collected through the Services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Types of Personal Data Collected</h2>
            <p className="leading-relaxed mb-4">
              The types of Personal Data that we may collect from you or through third parties will depend on our
              interactions with you and may include:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Wallet addresses you connect to the leap.fun Platform;</li>
              <li>
                On-chain transaction information associated with those wallet addresses, including transactions on
                the leap.fun Platform, the tokens you create or trade, and your interactions with the bonding curve,
                graduation, and post-graduation pools;
              </li>
              <li>Token metadata you submit, including token names, tickers, images, and descriptions;</li>
              <li>Communications you send to us, including support requests, inquiries, and any responses;</li>
              <li>
                Usage Data, which can include your IP address, your country of origin, the features of the browser or
                operating system utilised by you, how you use the leap.fun Platform, and other identifiers;
              </li>
              <li>
                Any other information that you choose to provide to us, including through forms, surveys, or social
                channels.
              </li>
            </ul>
            <p className="leading-relaxed mt-4 mb-4">
              We may also collect Personal Data about you from third parties and other sources, such as publicly
              available sources of information and blockchain data.
            </p>
            <p className="leading-relaxed mb-4">
              We collect this information from you when you freely provide it on the leap.fun Platform or when you use
              the leap.fun Platform. We may also collect your Personal Data from third parties or publicly available
              sources as noted above.
            </p>
            <p className="leading-relaxed">
              Unless specified otherwise, all Personal Data requested by us is necessary for the operation of the
              relevant feature, and failure to provide this Personal Data may make it impossible for you to access or
              use certain features of the leap.fun Platform. Where the Platform indicates that some Personal Data is
              optional, you are free not to provide it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Information We Automatically Collect</h2>
            <p className="leading-relaxed">
              When you visit the leap.fun Platform, we may automatically collect certain information about your device,
              including information about your web browser, IP address and/or domain name, device information, browser
              type and version, timezone setting, browser plug-in types and versions, operating systems and platforms,
              approximate location information, and some of the cookies that are installed on your device using cookies
              and similar technologies. Additionally, as you browse the leap.fun Platform, we may collect information
              about the individual web pages or services that you view, what websites or search terms referred you to
              the leap.fun Platform, and information about how you interact with the leap.fun Platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Cookies &amp; Similar Technologies</h2>
            <p className="leading-relaxed mb-4">
              We use cookies (small, often encrypted, text files that are stored on your computer or mobile device) and
              similar technologies (&quot;Cookies&quot;) to provide you with certain functions on our Site and help collect
              data. This section explains how we use Cookies to collect information about the way you use our Site and
              how you can control them.
            </p>

            <h3 className="text-lg font-medium text-foreground mb-2">How We Use Cookies</h3>
            <p className="leading-relaxed mb-4">
              We use Cookies to track how you use the leap.fun Platform by providing usage statistics. Cookies are also
              used to deliver our information (including updates) and allow session authentication based upon your
              browsing history and previous visits to the leap.fun Platform.
            </p>
            <p className="leading-relaxed mb-6">
              We do not combine or link data or information gathered from Cookies with third-party data for targeted
              advertising or advertising measurement purposes, and we do not share data collected about a particular
              end-user or device with a data broker.
            </p>

            <h3 className="text-lg font-medium text-foreground mb-2">Types of Cookies</h3>
            <p className="leading-relaxed mb-4">
              We use both session Cookies (which expire once you close your web browser) and persistent Cookies (which
              stay on your device until you delete them). The Cookies we use on the leap.fun Platform can be grouped
              into the following categories:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-6">
              <li>
                <strong className="text-foreground">Strictly Necessary:</strong> These Cookies are necessary for the
                leap.fun Platform to work properly. They include any essential authentication and session Cookies.
              </li>
              <li>
                <strong className="text-foreground">Functionality:</strong> These Cookies enable technical performance
                and allow us to remember the choices you make while browsing the leap.fun Platform, including any
                preferences you set.
              </li>
              <li>
                <strong className="text-foreground">Performance/Analytical:</strong> These Cookies allow us to collect
                certain information about how you navigate the leap.fun Platform. They help us understand which areas you
                use and what we can do to improve them.
              </li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mb-2">How to Control and Delete Cookies</h3>
            <p className="leading-relaxed mb-4">
              Cookies can be controlled, blocked or restricted through your web browser settings. Information on how to
              do this can be found within the Help section of your browser. All Cookies are browser specific.
              Therefore, if you use multiple browsers or devices to access websites, you will need to manage your Cookie
              preferences across these environments.
            </p>
            <p className="leading-relaxed mb-4">
              If you are using a mobile device to access the leap.fun Platform, you will need to refer to your
              instruction manual or other help/settings resource to find out how you can control Cookies on your device.
              For more information about cookies, and how to disable cookies, visit{' '}
              <a
                href="https://www.allaboutcookies.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline hover:text-foreground/80"
              >
                https://www.allaboutcookies.org
              </a>
              .
            </p>
            <p className="leading-relaxed">
              Please note that if you restrict, disable or block any or all Cookies from your web browser or mobile
              device, the leap.fun Platform may not operate properly, and you may not have access to all features of the
              Platform. We are not responsible for your inability to use the leap.fun Platform or any degraded function
              you may experience that may be caused by your settings and choices regarding Cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Analytics</h2>
            <p className="leading-relaxed">
              We may use third-party analytics providers to help us analyse how you use the leap.fun Platform. These
              providers generate statistical and other information about Platform use by means of cookies, which are
              stored on users&apos; devices. The information generated is used to create reports about the use of the
              leap.fun Platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Method and Basis of Processing Data</h2>

            <h3 className="text-lg font-medium text-foreground mb-2">Methods of processing</h3>
            <p className="leading-relaxed mb-4">
              We take appropriate security measures to prevent unauthorised access, disclosure, modification, or
              unauthorised destruction of Personal Data.
            </p>
            <p className="leading-relaxed mb-6">
              Personal Data processing is carried out using computers and IT-enabled tools, following organisational
              procedures and modes strictly related to the purposes indicated. Data may be accessible to you and in some
              cases to certain types of persons in charge, involved with the operation of the leap.fun Platform
              (administration, legal, system administration) or external parties (such as third-party technical service
              providers, hosting providers, IT companies) appointed, where necessary, as Data Processors by us. You may
              request a list of these parties at any time.
            </p>

            <h3 className="text-lg font-medium text-foreground mb-2">Legal basis of processing</h3>
            <p className="leading-relaxed mb-4">
              We may process Personal Data relating to you if one of the following applies:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>You have given your consent for one or more specific purposes;</li>
              <li>
                Provision of Personal Data is necessary for the performance of an agreement with you and/or for any
                pre-contractual obligations thereof;
              </li>
              <li>Processing is necessary for compliance with a legal obligation to which we are subject;</li>
              <li>
                Processing is related to a task that is carried out in the public interest or in the exercise of
                official authority vested in us;
              </li>
              <li>
                Processing is necessary for the purposes of the legitimate interests pursued by us or by a third party.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">How We Use Personal Data</h2>
            <p className="leading-relaxed mb-4">Data we collect about you is collected to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide the leap.fun Platform and customer support you request;</li>
              <li>Process transactions and surface information about your transactions on the leap.fun Platform;</li>
              <li>Detect any malicious, fraudulent, or unauthorised activity;</li>
              <li>Monitor and analyse usage of the leap.fun Platform;</li>
              <li>Beta test certain features of the leap.fun Platform;</li>
              <li>Contact you regarding the Services;</li>
              <li>Display content from external platforms;</li>
              <li>Optimise traffic and performance of the leap.fun Platform;</li>
              <li>Authenticate sessions and verify wallet connections;</li>
              <li>Comply with legal obligations and respond to enforcement requests;</li>
              <li>
                Protect the rights and interests of leap.fun and its affiliates (or those of our users and third
                parties);
              </li>
              <li>Monitor infrastructure;</li>
              <li>Engage in traffic optimisation and distribution.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">How We Share Personal Data</h2>
            <p className="leading-relaxed mb-4">
              We may share your Personal Data with categories of third parties that provide services to us, including
              hosting and infrastructure providers, analytics providers, security and fraud-prevention providers,
              communications providers, and other vendors necessary to operate the leap.fun Platform. These third
              parties may use your Personal Data only as directed or authorised by us and in a manner consistent with
              this Privacy Notice, and are prohibited from using or disclosing your information for any other purpose.
              We do not share your Personal Data with third parties for their own marketing purposes without your
              consent. We may also share your Personal Data within our group and with affiliates, for purposes
              consistent with this Privacy Notice, and for compliance purposes as required or permitted by applicable
              law.
            </p>
            <p className="leading-relaxed mb-4">
              The leap.fun Platform interacts with Leveraged Token contracts operated by BounceTech, an independent
              third party. When you buy or sell tokens on the leap.fun Platform, the USDC router converts USDC to or from
              Leveraged Tokens by calling BounceTech&apos;s contracts. These interactions are recorded on the public
              blockchain. BounceTech is not controlled by leap.fun, and BounceTech&apos;s handling of any data associated
              with those interactions is governed by BounceTech&apos;s own policies, not this Privacy Notice.
            </p>
            <p className="leading-relaxed">
              We may sell, transfer or otherwise share some or all of our business or assets, including your Personal
              Data, in connection with a business transaction (or potential business transaction) such as a corporate
              divestiture, merger, consolidation, acquisition, reorganisation or sale of assets, or in the event of
              bankruptcy or dissolution.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Retention of Personal Data</h2>
            <p className="leading-relaxed mb-4">
              We will retain your Personal Data for as long as necessary to fulfil the purposes we collected it for,
              including for the purposes of satisfying any legal, regulatory, accounting, or reporting requirements. We
              determine data retention based on the amount, nature, and sensitivity of the Personal Data, the potential
              risk of harm from unauthorised use, the purposes for which we process your Personal Data and whether we
              can achieve those purposes through other means, and applicable legal requirements.
            </p>
            <p className="leading-relaxed mb-4">
              Personal Data collected for purposes related to the performance of a contract between you and us will be
              retained until such contract has been fully performed. Personal Data collected for our legitimate
              interests will be retained as long as needed to fulfil such purposes.
            </p>
            <p className="leading-relaxed mb-4">
              We may be allowed to retain Personal Data for a longer period whenever you have given consent to such
              processing, as long as such consent is not withdrawn. Furthermore, we may be obliged to retain Personal
              Data for a longer period whenever required to do so for the performance of a legal obligation or upon
              order of an authority.
            </p>
            <p className="leading-relaxed mb-4">
              Once the retention period expires, Personal Data will be deleted (or, where permitted under applicable
              law, may be de-identified instead). Therefore, the right of access, the right to erasure, the right to
              rectification and the right to data portability (where relevant under applicable law) cannot be enforced
              after expiration of the retention period.
            </p>
            <p className="leading-relaxed">
              However, not all your Personal Data may be able to be deleted or de-identified; see the section of this
              Privacy Notice on &quot;Blockchain Transactions&quot; below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Privacy Technology Practices</h2>

            <h3 className="text-lg font-medium text-foreground mb-2">Links to Third-Party Sites</h3>
            <p className="leading-relaxed mb-6">
              The leap.fun Platform may contain links to other websites, mobile applications, and other online services
              operated by third parties. These links are not an endorsement of, or representation that we are affiliated
              with, any third party. In addition, our content may be included on web pages or in mobile applications or
              online services that are not associated with us. We do not control third-party websites, mobile
              applications or online services, and we are not responsible for their actions. Other websites, mobile
              applications and services follow different rules regarding the collection, use and sharing of your
              Personal Data. We encourage you to read the privacy policies of the other websites, mobile applications
              and online services you use.
            </p>

            <h3 className="text-lg font-medium text-foreground mb-2">Data Security</h3>
            <p className="leading-relaxed mb-4">
              The security of your Personal Data is important to us. We employ a number of administrative, technical, and
              physical safeguards designed to protect the Personal Data we collect. The safety and security of your
              information also depends on you. We ask you not to share any of your personal security information,
              including private keys, seed phrases, or wallet credentials. leap.fun will never ask for these.
            </p>
            <p className="leading-relaxed mb-6">
              Unfortunately, the transmission of information via the internet is not completely secure. Although we do
              our best to protect your Personal Data, we cannot guarantee the security of your Personal Data transmitted
              to the leap.fun Platform. Any transmission of Personal Data is at your own risk.
            </p>

            <h3 className="text-lg font-medium text-foreground mb-2">Blockchain Transactions</h3>
            <p className="leading-relaxed mb-4">
              Your use of digital assets through the leap.fun Platform is recorded on a public blockchain, in particular
              the settlement of your trades and the deployment of tokens. Public blockchains are distributed ledgers,
              intended to immutably record transactions across wide networks of computer systems. Many blockchains are
              open to forensic analysis which can lead to re-identification of transacting individuals and the revelation
              of personal data, especially when blockchain data is combined with other data.
            </p>
            <p className="leading-relaxed">
              As blockchains are decentralised or third-party networks which are not controlled or operated by us, we
              are not able to erase, modify, or alter personal data on such networks. This includes wallet addresses,
              transaction history, token deployments, and any other data written to the blockchain in connection with your
              use of the leap.fun Platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Overseas Disclosure and Your Privacy Rights</h2>
            <p className="leading-relaxed mb-4">
              For purposes of relevant data protection legislation, leap.fun is the Personal Data controller. leap.fun and
              its affiliates may operate in multiple jurisdictions. As a result, Personal Data may be transferred outside
              the country in which you reside for the purposes identified. Any such transfer of Personal Data shall take
              place under applicable law and will be protected through appropriate international data transfer mechanisms
              where necessary. By using the leap.fun Platform you understand that your Personal Data may be processed
              outside of your country of residence, including outside of the EEA and the UK.
            </p>
            <p className="leading-relaxed mb-4">
              Residents of the EEA and the UK are granted certain rights over their Personal Data, which include:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>The right to obtain confirmation of the Personal Data we process;</li>
              <li>The right to rectify inaccurate Personal Data that we process;</li>
              <li>
                The right to request erasure of your Personal Data, subject to exceptions provided under the law;
              </li>
              <li>
                The right to restrict certain processing of your Personal Data, so long as the processing is not necessary
                for the performance of or in relation to a contract or service to which you are a party;
              </li>
              <li>
                The right to receive your Personal Data in a structured, commonly used and machine-readable format;
              </li>
              <li>
                The right to object to the processing of your Personal Data, including the right to object to automated
                decision-making and profiling;
              </li>
              <li>
                The right to withdraw your consent where you have previously given it for the processing of your
                Personal Data.
              </li>
            </ul>
            <p className="leading-relaxed mb-4">
              You are generally entitled to access Personal Data that we hold about you. If you request access to your
              Personal Data, in ordinary circumstances we will give you full access to your Personal Data. Depending on
              the nature of the request, we may charge for providing access to this information; however, such charge
              will not be excessive. There may be some legal or administrative reasons to deny access. If we refuse your
              request to access your Personal Data, we will provide you with reasons for the refusal where we are required
              by law to give those reasons.
            </p>
            <p className="leading-relaxed">
              <strong className="text-foreground">Complaints:</strong> If you feel that we have not respected your privacy
              or that we have conducted ourselves inconsistently with this Privacy Notice, please contact Support and
              advise us as soon as possible. We will investigate your queries and privacy complaints within a reasonable
              period of time depending on the complexity of the complaint. We will notify you of the outcome of our
              investigation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Contact</h2>
            <p className="leading-relaxed mb-4">
              If you would like to exercise any of the rights listed above, or if you would like to contact us about any
              questions you may have regarding your Personal Data, please email{' '}
              <a
                href="mailto:support@leap.fun"
                className="text-foreground underline hover:text-foreground/80"
              >
                support@leap.fun
              </a>{' '}
              and provide (i) enough information to identify you and (ii) a description of what right you want to exercise
              and the information to which your request relates. Any Personal Data we collect from you to verify your
              identity in connection with your request will be used solely for the purposes of verification.
            </p>
            <p className="leading-relaxed">
              If you are concerned that we have not complied with your legal rights or applicable privacy laws, you may
              contact us or your local data protection authority.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
