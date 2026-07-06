'use client'

import { Header } from '@/components/header'
import { PriceTicker } from '@/components/price-ticker'
import { Footer } from '@/components/footer'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      <Header />
      <PriceTicker />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-2">Terms Of Use</h1>
        <p className="text-sm text-muted-foreground mb-8">Last Updated: 18/05/2026</p>

        <div className="space-y-8 text-muted-foreground">
          <section className="space-y-4">
            <p className="leading-relaxed">
              These Terms of Use constitute a legally binding agreement between you (&quot;you&quot; or &quot;your&quot;) and leap.fun (&quot;leap.fun&quot;, &quot;Entities or affiliates&quot;, &quot;we&quot;, &quot;our&quot; or &quot;us&quot;). The Terms govern your use of all leap.fun Services made available to you on or through the leap.fun Platform or otherwise. leap.fun Services may be developed, maintained, and/or provided by the leap.fun Entities or affiliates.
            </p>
            <p className="leading-relaxed">
              By accessing the leap.fun Platform and/or using the leap.fun Services, as defined in these Terms, you agree that you have read, understood and accepted these Terms, together with any additional documents. You acknowledge and agree that you will be bound by and will comply with these Terms, as updated and amended from time to time.{' '}
              <span className="font-semibold text-foreground">
                BY ACCESSING THE LEAP.FUN PLATFORM AND USING LEAP.FUN SERVICES, YOU IRREVOCABLY WAIVE YOUR RIGHT TO PARTICIPATE IN A CLASS ACTION OR SIMILAR MASS ACTION IN ANY JURISDICTION OR BEFORE ANY TRIBUNAL AS STATED IN SECTION 26. YOU ALSO EXPRESSLY AGREE THAT ANY CLAIMS AGAINST ANY LEAP.FUN-RELATED ENTITY OR AFFILIATE WILL BE SUBJECT TO MANDATORY, BINDING ARBITRATION AS STATED IN SECTION 25.
              </span>
            </p>
            <p className="leading-relaxed">
              If you do not understand and accept these Terms in their entirety, you should not use the leap.fun Platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">RISK WARNING</h2>
            <div className="space-y-4 leading-relaxed">
              <p>
                The leap.fun Platform and leap.fun Services generally involve interacting with user-generated Digital Assets in various ways. Neither the leap.fun Entities nor any affiliates are responsible for user-generated Digital Assets that you may, in your sole discretion, engage with on the leap.fun Platform or via the leap.fun Services. Please ensure that you fully understand the risks involved with user-generated Digital Assets before using the leap.fun Platform and leap.fun Services.
              </p>
              <p>
                The value of User-Generated Digital Assets, especially memecoins that are commonly found on the leap.fun Platform and as part of the leap.fun Services, can fluctuate significantly and there is a material risk of economic loss when buying, selling, holding or investing in any Digital Asset. User-Generated Digital Assets on the leap.fun Platform are paired with Leveraged Tokens, which are subject to additional risks including but not limited to volatility decay, leverage-amplified losses, and potential NAV decline toward zero during adverse market conditions. You should therefore consider whether participating on the leap.fun Platform in general or leap.fun Services specifically is suitable for you taking into account your personal circumstances, financial, or otherwise.
              </p>
              <p>
                You acknowledge that we are not your broker, intermediary, agent or advisor and we have no fiduciary relationship or obligation to you in connection with any activities you undertake when using the leap.fun Platform or leap.fun Services. We do not and are not providing any investment or consulting advice and no communication or information that we provide to you is intended to be, or should be construed as, advice of any kind. We do not recommend that any user-generated Digital Asset be bought, earned, sold or held by you under any circumstances.
              </p>
              <p>
                You are responsible for determining whether any user-generated Digital Asset is appropriate for you to acquire, transact in, or otherwise use on the leap.fun Platform or with leap.fun Services based on your personal investment objectives, financial circumstances and risk tolerance and you are responsible for any associated loss or liability. Before making the decision to buy, sell or hold any user-generated Digital Asset, you should conduct your own due diligence about the creator of the Digital Asset and the underlying Leveraged Token and, where appropriate, consult your financial advisor. We are not responsible for the decisions you make to buy, earn, sell or hold Digital Assets based on the information or services provided by us or by users themselves through the leap.fun Platform or leap.fun Services, including any losses you may incur based on your decisions.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Introduction</h2>
            <div className="space-y-4 leading-relaxed">
              <p><strong className="text-foreground">1.1.</strong> The leap.fun Entities and their affiliates develop, maintain, operate, and provide access to the leap.fun Platform and leap.fun Services.</p>
              <p><strong className="text-foreground">1.2.</strong> By using the leap.fun Platform or any of the leap.fun Services you are entering into a legally binding agreement with all leap.fun Entities and their affiliates. These Terms will govern your use of the leap.fun Platform and all of the leap.fun Services.</p>
              <p><strong className="text-foreground">1.3.</strong> You acknowledge that you must read these Terms, together with the documents referenced in the Terms, carefully and are responsible for telling us if you do not understand anything.</p>
              <p><strong className="text-foreground">1.4.</strong> You expressly agree that you will be bound by, and that you will comply with, any additional terms and conditions that apply to your use of the leap.fun Platform or any of the leap.fun Services.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">2. Eligibility</h2>
            <div className="space-y-4 leading-relaxed">
              <p><strong className="text-foreground">2.1.</strong> To be eligible to use the leap.fun Platform and the leap.fun Services:</p>
              <ul className="list-[lower-alpha] list-inside space-y-2 ml-4">
                <li>you must be an individual, corporation, legal person, entity or other organisation with the full power, authority and capacity to: (i) access and use the leap.fun Platform; and (ii) enter into and comply with your obligations under these Terms, including, in the case of an individual, being of the legal age of majority in your country;</li>
                <li>if you act as an employee or agent of a legal entity, and enter into these Terms on their behalf, you must be duly authorised to act on behalf of and bind such legal entity for the purposes of entering into these Terms;</li>
                <li>not be located, incorporated, otherwise established in, or resident of, or have business operations in: (i) a jurisdiction where it would be illegal under Applicable Law for you to access or use the leap.fun Platform and/or leap.fun Services, or cause us or any third party to contravene any Applicable Law; or (ii) a country listed in our List of Prohibited Countries.</li>
              </ul>
              <p>
                <strong className="text-foreground">2.2.</strong> We may amend our eligibility criteria at any time at our sole discretion. We retain the sole discretion to make changes without telling you in advance. For example, we may change these Terms without notifying you where: (a) we are making the change as a result of legal and/or regulatory changes; (b) the changes being made are in your interest; and/or (c) there is any other valid reason which means there is no time to give you notice.
              </p>
              <p>We will let you know of the change as soon as possible after it is made by updating the &quot;last updated&quot; date at the top of these Terms.</p>
              <p>You acknowledge and agree that you are responsible for checking these Terms to stay abreast of any changes related to your use, and that we may terminate your use of the leap.fun Platform and any of the leap.fun Services at any time for any reason.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">3. leap.fun Platform</h2>
            <div className="space-y-4 leading-relaxed">
              <p><strong className="text-foreground">3.1.</strong> Usage of the leap.fun Platform and leap.fun Services is provided at our absolute discretion. We reserve the right to refuse any usage of, or restrict your access to, the leap.fun Platform and leap.fun Services for any reason, or without reason at any time.</p>
              <p><strong className="text-foreground">3.2.</strong> You must not take any action or otherwise post, upload or publish to the leap.fun Platform any abusive, defamatory, dishonest, or obscene message or any messages intended to manipulate a market or to spread false or misleading information or messages that are otherwise in contravention of Applicable Laws. Violating this provision may result in termination of or restrictions on the availability of the leap.fun Platform and leap.fun Services to you.</p>
              <p><strong className="text-foreground">3.3.</strong> You must not take any action or otherwise post, upload or publish to any platform or media any abusive, defamatory, dishonest, or obscene message or any messages intended to manipulate a market or to spread false or misleading information or messages that are otherwise in contravention of Applicable Laws in respect of any user-generated Digital Assets created using the leap.fun Services. Violating this provision may result in termination of or restrictions on the availability of the leap.fun Services to you.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">4. Fees and Calculations</h2>
            <div className="space-y-4 leading-relaxed">
              <p><strong className="text-foreground">4.1.</strong> Fees for use of the leap.fun Services can be found on the leap.fun Platform. leap.fun Entities and affiliates do not charge any fees related to accessing the leap.fun Platform, but reserve the right to do so in their sole discretion in the future.</p>
              <p><strong className="text-foreground">4.2.</strong> You agree to pay all applicable fees in connection with your use of the leap.fun Services as requested during your use of those services, whether on the leap.fun Platform or via a separate third-party interface. You understand that the leap.fun Entities and affiliates do not control any fees charged by third parties you may use to access the leap.fun Services, and you are solely responsible for payment of any third-party fees. This includes, but is not limited to, fees charged by third-party decentralised exchanges on which tokens may trade following graduation from the bonding curve.</p>
              <p><strong className="text-foreground">4.3.</strong> You expressly authorise us to deduct all applicable fees, commissions, interest, charges and other sums that you owe from the Wallet that you connect to the leap.fun Platform under these Terms.</p>
              <p><strong className="text-foreground">4.4.</strong> Amending our fees: We may adjust our fees from time to time in accordance with Clause 13.4 of these Terms. If you do not wish to accept the changed fees, you must cease use of the leap.fun Platform and relevant leap.fun Services. Your continued access to or use of the leap.fun Platform and relevant leap.fun Services shall be deemed acceptance of the updated fee.</p>
              <p><strong className="text-foreground">4.5.</strong> Calculations: Any calculations of fees made by the leap.fun Entities or affiliates in connection with your use of the leap.fun Services are final and binding on you in the absence of Manifest Error.</p>
              <div>
                <p className="font-medium text-foreground mb-2"><strong>4.6. Creator Fees</strong></p>
                <div className="space-y-4">
                  <p>Certain tokens launched by users of the leap.fun Platform may include &quot;Creator Fees&quot;. Creator Fees are fees which are collected by the protocol for each transaction and paid to the creator of the token (except as set forth herein). The leap.fun Entities make no representations or warranties regarding the Creator Fees to any User or token creator.</p>
                  <p>Creator Fees are dependent on network conditions, smart contracts, and third-party infrastructure. The leap.fun Entities do not guarantee that Creator Fees will be successfully charged or distributed for any particular transaction. We are not liable for on-chain failures, network congestion, or other technical issues that may prevent fee collection or payout.</p>
                  <p>Where possible, the Service will display an estimated breakdown of Creator Fees, protocol fees, and any other relevant fees prior to transaction confirmation. However, the actual fee applied and charged is determined by the underlying smart contracts and may differ slightly from the displayed estimate, for example due to slippage, network conditions, or rounding.</p>
                  <p>Creator Fees are routed to one or more designated wallet addresses as configured by the token creator, or as otherwise specified by the applicable smart contract. In some configurations, Creator Fees may be shared among multiple wallets.</p>
                  <p>The leap.fun Entities do not control how Creator Fees are ultimately used, distributed, or shared between creators, team members, promoters, referrers, or other third parties. Any such arrangements are strictly between you and those third parties.</p>
                  <p>You are solely responsible for determining and fulfilling any tax obligations related to Creator Fees or other activity using the leap.fun Platform, including reporting and remitting income, capital gains, VAT, or similar taxes. The leap.fun Entities and their affiliates do not provide tax advice in any jurisdiction for any purposes.</p>
                  <p>You agree that you will use Creator Fees in compliance with all applicable laws and regulations (including securities, commodities, AML, and KYC requirements, as applicable), not use Creator Fees to launder money, finance terrorism, or engage in fraud or other illegal activities and not misrepresent Creator Fee settings, token economics, or related rights to others.</p>
                  <p>If you make any public statements or marketing materials about tokens using the Creator Fees, you must ensure those statements are accurate and not misleading.</p>
                  <p>Some Creator Fees may be subject to a community takeover (&quot;CTO&quot;). A CTO occurs when control over Creator Fees and certain admin rights are handed from the original deployer to a new community-chosen team or individual. CTOs are handled in the sole discretion of the leap.fun Entities and their affiliates or designees. CTOs may be governed by separate terms, as stated in the CTO application.</p>
                  <p>The leap.fun Entities waive all liability, except as explicitly stated herein, for any actions taken with respect to a CTO. By accepting Creator Fees, any User acknowledges that those Creator Fees are subject to the CTO process and may be re-routed through the CTO process.</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Leveraged Tokens and Bonding Curves</h2>
            <div className="space-y-4 leading-relaxed">
              <p><strong className="text-foreground">5.1.</strong> User-Generated Digital Assets created on the leap.fun Platform are paired with Leveraged Tokens (&quot;LTs&quot;) issued by third-party protocols. LTs are tokens whose value is derived from leveraged exposure to an underlying asset via perpetual futures. The leap.fun Entities do not issue, control, or manage LTs and make no representations or warranties regarding LT performance, NAV accuracy, or rebalancing behaviour.</p>
              <p><strong className="text-foreground">5.2.</strong> You acknowledge and agree that:</p>
              <ul className="list-[lower-alpha] list-inside space-y-2 ml-4">
                <li>LTs are subject to volatility decay, which means the value of an LT may decline over time even if the underlying asset returns to its original price;</li>
                <li>LTs with higher leverage multipliers carry proportionally greater risk of rapid value decline, including potential decline toward zero in extreme market conditions;</li>
                <li>the bonding curve on the leap.fun Platform is denominated in LTs, not in stablecoins or native tokens. The USD value of positions on the bonding curve may fluctuate based on both trading activity and changes in the LT&apos;s net asset value;</li>
                <li>the progress of a bonding curve toward graduation may regress if the underlying LT NAV declines, even in the absence of sell activity;</li>
                <li>upon graduation, liquidity is migrated to a third-party decentralised exchange as a token/LT trading pair. The leap.fun Entities do not control the operation, availability, or performance of third-party decentralised exchanges;</li>
                <li>buying and selling User-Generated Digital Assets on the leap.fun Platform involves interaction with LT minting and redemption mechanisms provided by third-party protocols. The leap.fun Entities are not responsible for the operation, availability, or accuracy of these third-party mechanisms;</li>
                <li>the leap.fun Platform provides a USDC router for convenience. When you submit a buy or sell instruction using USDC, the router automatically converts USDC to or from LTs via third-party protocols. This conversion is subject to slippage, smart contract risk, and third-party protocol availability. The leap.fun Entities are not responsible for the performance or availability of the USDC router or underlying conversion mechanisms.</li>
              </ul>
              <p><strong className="text-foreground">5.3.</strong> The leap.fun Platform may display leverage decomposition information, showing the estimated contribution of trading activity and LT NAV changes to overall price movement. This information is provided for informational purposes only and is based on estimates that may not be perfectly accurate. You should not rely on leverage decomposition data as the sole basis for any trading decision.</p>
              <p><strong className="text-foreground">5.4.</strong> The leap.fun Entities do not provide, endorse, or guarantee any particular Leveraged Token or the protocol that issues it. The inclusion of any LT on the leap.fun Platform does not constitute a recommendation to buy, sell, or hold the LT or any User-Generated Digital Asset paired with it.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">6. Records</h2>
            <p className="leading-relaxed">
              We keep your personal data to enable your continued use of the leap.fun Platform and leap.fun Services, including as may be required by law for tax and accounting purposes as well as compliance with other laws and regulations. You understand and agree that our use of and your rights related to your data are set forth in our Privacy Notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">7. Accessing the leap.fun Platform</h2>
            <div className="space-y-4 leading-relaxed">
              <p><strong className="text-foreground">7.1.</strong> To access the leap.fun Platform and leap.fun Services, you must have the necessary equipment (such as a computer or smartphone) and access to the internet. You can access the leap.fun Platform and leap.fun Services through the use of bots or otherwise as we may permit from time to time, as long as such access otherwise complies with all requirements and rules established in these Terms.</p>
              <p><strong className="text-foreground">7.2.</strong> The use of the leap.fun Platform and other access methods may be subject to such additional terms as we require from time to time and which we will communicate to you.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">8. Transactions</h2>
            <div className="space-y-4 leading-relaxed">
              <p><strong className="text-foreground">8.1.</strong> You acknowledge and agree that where you execute any Transaction with Improper Intent and/or in the case of Manifest Error, leap.fun is authorised by you (without any payment or penalty or liability due by leap.fun and provided that such action is in compliance with Applicable Law) to cancel/void such Transaction (to the extent possible), take such actions as leap.fun may reasonably deem fit and treat such Transaction as if it had never been entered into.</p>
              <p><strong className="text-foreground">8.2.</strong> We may be required under these Terms or Applicable Law to share information about your activities on the leap.fun Platform with third parties and within the leap.fun Group. You acknowledge and agree that we are entitled to disclose such information.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">9. Submission of Instructions</h2>
            <div className="space-y-4 leading-relaxed">
              <p><strong className="text-foreground">9.1.</strong> Instructions are transactions or commands executed on the HyperEVM blockchain using the leap.fun Platform and leap.fun Services. You must ensure that any Instruction submitted is complete and accurate. We are not required to verify the accuracy, authenticity or validity of any Instruction and will not monitor or reject Instructions on the basis that they are, or appear to be, duplicates. In our sole, absolute discretion, we may refuse to act upon or defer acting upon any Instruction, or seek further information with respect to the Instruction.</p>
              <p><strong className="text-foreground">9.2.</strong> You acknowledge and agree that Instructions are irrevocable and therefore once an Instruction has been submitted you have no right to unilaterally rescind or withdraw it. Your Instruction is not deemed to be received by us until it has been received by our server. Our record of all Instructions will be conclusive and binding on you for all purposes.</p>
              <p><strong className="text-foreground">9.3.</strong> By submitting an Instruction you are authorising us to initiate transaction(s) using your Wallet on the HyperEVM blockchain. We are therefore authorised to credit or debit (or provide information to third parties for the purposes of the third party crediting or debiting) your Digital Assets from your Wallet in accordance with your Instruction. If you have insufficient Digital Assets in your Wallet to effect the Transaction (i.e. less than the required amount to settle the Transaction and to pay all the fees associated with the Transaction), then we have the right to refuse to effect any Transaction. leap.fun Entities and affiliates may also refuse to act on instructions to the extent permitted by these Terms. It is your responsibility to hold sufficient Digital Assets in your Wallet.</p>
              <p><strong className="text-foreground">9.4.</strong> You are aware that Instructions and information transmitted on the leap.fun Platform or by email are generally transmitted via the internet and may be routed via public, transnational installations which are not specifically protected. We cannot guarantee that the Instructions and information transmitted will be completely protected against unauthorised access, and you accept the associated risks. Our privacy practices and your rights are disclosed in our Privacy Notice.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">10. Transactions</h2>
            <div className="space-y-4 leading-relaxed">
              <p><strong className="text-foreground">10.1.</strong> We do not represent or warrant that any actions by you on the leap.fun Platform or use of the leap.fun Services will be completed successfully or within a specific time period. By accessing and using the leap.fun Platform and leap.fun Services, you represent that you understand that smart contract transactions, like the ones conducted through the leap.fun Platform and leap.fun Services, automatically execute and settle, and that blockchain-based systems are variable and transaction speeds may increase dramatically at any time.</p>
              <p><strong className="text-foreground">10.2.</strong> You expressly agree that the leap.fun Entities and affiliates are permitted, but not required, to keep a record of all Transaction information related to use of the leap.fun Platform and leap.fun Services. You further agree that we may keep this information, if we collect it, for as long as it is required to fulfill its intended purpose or any other period of time as required by Applicable Law.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">11. Material Interests and Conflicts</h2>
            <div className="space-y-4 leading-relaxed">
              <p><strong className="text-foreground">11.1.</strong> You understand and agree that neither your relationship with us nor any services we provide to you, nor any other matter, will give rise to any duties on our part or on the part of any leap.fun Entity or affiliate, whether legal, equitable, fiduciary in nature, save as are expressly set out in these Terms. In particular, leap.fun Entities and affiliates may from time to time act in more than one capacity, and in those capacities we may receive fees or commissions from more than one user (including you). You agree that we may act in such capacities and provide any other services or carry out any business with or for you, any other leap.fun Entity or affiliate or any other user.</p>
              <p><strong className="text-foreground">11.2.</strong> You understand and agree that, except as required under our Privacy Notice, the leap.fun Entities and affiliates will not be required to: (i) have regard to any information known to us, which is or may be a material interest; (ii) disclose any such information to you; or (iii) use any such information for your benefit. You further acknowledge that from time to time we may receive general market information in the course of providing access to the leap.fun Platform and leap.fun Services to you, which we may use in the ordinary course of our business.</p>
              <p><strong className="text-foreground">11.3.</strong> We have established and maintain effective organisational and administrative arrangements with a view to taking all appropriate steps to identify and manage conflicts of interest between us and our users and relevant third parties, so as to prevent conflicts of interest from adversely affecting the interests of our users. We reserve the right at all times to decline to act for you where we are not able to manage a conflict of interest in any other way.</p>
              <p><strong className="text-foreground">11.4.</strong> You understand that from time to time we may transact using the leap.fun Platform. We are under no obligation to disclose any of our transactions on the leap.fun Platform.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">12. Transaction Limits</h2>
            <p className="leading-relaxed">
              Your activity on the leap.fun Platform and use of the leap.fun Services may be subject to limits that we shall determine from time to time in our sole discretion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">13. Security</h2>
            <div className="space-y-4 leading-relaxed">
              <p><strong className="text-foreground">13.1.</strong> You are responsible for taking appropriate action to protect your hardware and data from viruses and malicious software, and any inappropriate material. Except as provided by Applicable Law, you are responsible for backing up and maintaining duplicate copies of any information related to your use of the leap.fun Platform and leap.fun Services. The leap.fun Entities and affiliates are not responsible for any claim or losses resulting from your failure to comply with this clause.</p>
              <p><strong className="text-foreground">13.2.</strong> At all times, you, and anyone you permit to access the leap.fun Platform and leap.fun Services using your Wallet (&quot;Permitted Users&quot;), shall maintain adequate security and control of all of the information used to access the leap.fun Platform and leap.fun Services. You are responsible for taking the necessary security measures to protect such details, including by:</p>
              <ul className="list-[lower-alpha] list-inside space-y-2 ml-4">
                <li>strictly abiding by all of our mechanisms or procedures;</li>
                <li>never allowing remote access or sharing your computer and/or computer screen with someone else when you are logged into the leap.fun Platform or are using the leap.fun Services;</li>
                <li>remembering that under no circumstances will we ask you to share any of your passwords or 2-factor authentication codes or similar. You should never disclose these if asked.</li>
              </ul>
              <p><strong className="text-foreground">13.3.</strong> You are solely responsible for keeping the information used to access the leap.fun Platform and leap.fun Services secure against any attacks and unauthorised access.</p>
              <p><strong className="text-foreground">13.4.</strong> It is important that you monitor your Activity History to ensure any unauthorised or suspicious activity on your account is identified. You agree that you are required to notify us as soon as possible of any suspicious activity involving the Wallet you use to access the leap.fun Platform and leap.fun Services. You acknowledge that any Security Breach may result in unauthorised access to your Wallet by third parties and the loss or theft of any Digital Assets and/or funds from your Wallet and any associated Wallets or accounts.</p>
              <p><strong className="text-foreground">13.5.</strong> If you suspect a Security Breach, you must ensure that:</p>
              <ul className="list-[lower-alpha] list-inside space-y-2 ml-4">
                <li>we are notified immediately and continue to be provided with accurate and up-to-date information throughout the duration of the Security Breach;</li>
                <li>you take any other steps that we may reasonably require to reduce, manage or report any Security Breach.</li>
              </ul>
              <p><strong className="text-foreground">13.6.</strong> We reserve the right to request, and you agree to promptly provide, any and all information and documents we deem relevant or necessary in connection with an actual or suspected Security Breach. You further acknowledge and agree that we may provide such information to any third party that we deem necessary in order to investigate or resolve any Security Breach.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">14. Privacy</h2>
            <div className="space-y-4 leading-relaxed">
              <p><strong className="text-foreground">14.1.</strong> Our collection and use of personal data in connection with these Terms, your access to the leap.fun Platform, and use of the leap.fun Services is as provided in our Privacy Notice (as updated from time to time). You acknowledge that we may process personal data in relation to you, that you have provided to us, or we have collected from you in connection with these Terms and our Privacy Notice. Your personal data will be processed in accordance with the Privacy Notice, which shall form part of these Terms.</p>
              <p><strong className="text-foreground">14.2.</strong> You represent and warrant that:</p>
              <ul className="list-[lower-alpha] list-inside space-y-2 ml-4">
                <li>you acknowledge that you have read, understood, and agree to our Privacy Notice;</li>
                <li>our business changes regularly and our Privacy Notice will change also. Therefore, if from time to time we provide you with a replacement version of the Privacy Notice, you will promptly read the Privacy Notice.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">15. Amending the Terms</h2>
            <div className="space-y-4 leading-relaxed">
              <p><strong className="text-foreground">15.1.</strong> We can make changes to these Terms and any terms and conditions incorporated by reference at any time and your continued use of the leap.fun Platform and leap.fun Services constitutes your consent to such changes. Changes to these Terms will be published on our website and may also be notified to users by such other means as leap.fun Entities and affiliates determine in their sole discretion. You acknowledge and agree that you are required to check these Terms periodically to ensure that you are aware of any and all changes.</p>
              <p><strong className="text-foreground">15.2.</strong> If you do not wish to accept these Terms or any future modified Terms, you must cease use of the leap.fun Platform and leap.fun Services. Your continued access to or use of the leap.fun Platform and leap.fun Services shall be deemed acceptance of the updated Terms.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">16. Termination, Suspensions, Restrictions</h2>
            <div className="space-y-4 leading-relaxed">
              <p><strong className="text-foreground">16.1.</strong> We may at any time modify or discontinue, temporarily or permanently, any portion or feature of the leap.fun Platform or leap.fun Services. In particular, we may: (i) refuse to complete or block, cancel, or, where permitted by Applicable Law, reverse (to the extent possible) any action you have undertaken; (ii) terminate, suspend, or restrict your access to any or all of the leap.fun Platform and leap.fun Services; (iii) refuse to transmit information or Instructions to third parties (including but not limited to third-party Wallet operators); and/or (iv) take whatever action we consider necessary, in each case with immediate effect and for any reason including, but not limited to where:</p>
              <ul className="list-[lower-alpha] list-inside space-y-2 ml-4">
                <li>you are not, or are no longer, eligible to use the leap.fun Platform and leap.fun Services;</li>
                <li>we reasonably suspect that: (i) the person connecting to the leap.fun Platform or leap.fun Services with your Wallet is not you, or we suspect that you have been or will be using the leap.fun Platform or leap.fun Services for any illegal, fraudulent, or unauthorised purposes; (ii) information provided by you is wrong, untruthful, outdated, or incomplete;</li>
                <li>we reasonably consider that we are required to do so by Applicable Law, or any court or authority;</li>
                <li>we have determined or suspect: (i) that you have breached these Terms; (ii) that any activity is unauthorised, erroneous, fraudulent, or unlawful or we suspect the leap.fun Platform, Services or Wallet are being used as such; (iii) there is any occurrence of money laundering, terrorist financing, fraud or any other crime in connection with your usage;</li>
                <li>your usage is subject to any pending, ongoing or threatened litigation or regulatory proceedings;</li>
                <li>you have taken any action that may circumvent our controls without our consent;</li>
                <li>there is any other valid reason which means we need to do so.</li>
              </ul>
              <p><strong className="text-foreground">16.2.</strong> You acknowledge and agree that: (a) the examples set out above are non-exhaustive; and (b) our decision to terminate, suspend, or restrict access may be based on confidential criteria that are essential to our risk management and security protocols. We are under no obligation to disclose these to you.</p>
              <p><strong className="text-foreground">16.3.</strong> Where we terminate, suspend, hold or restrict your access: (a) if you have Instructions or Transactions that are open, they may be closed by you or by us depending on the circumstances; (b) you authorise us to deduct any unpaid costs and fees directly from assets in the Wallet you connected.</p>
              <p><strong className="text-foreground">16.4.</strong> If we are informed and reasonably believe that any Digital Assets in your Wallet are stolen or not lawfully possessed by you (whether by error or otherwise), we may, but are not obligated to, terminate your usage of the leap.fun Platform and Services. Except where required by law, we will not become involved in any dispute relating to such assets or their origin.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">17. leap.fun IP</h2>
            <p className="leading-relaxed">
              All leap.fun IP shall remain vested in leap.fun Entities and their affiliates. At no point do users of the leap.fun Platform or leap.fun Services obtain any right to leap.fun IP unless expressly provided by these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">18. Licence of leap.fun IP</h2>
            <p className="leading-relaxed">
              We grant to you a non-exclusive licence for the duration of these Terms, or until we suspend or terminate your usage of the leap.fun Platform and leap.fun Services, whichever is sooner, to use the leap.fun IP, excluding the leap.fun Trade Marks, solely as necessary to allow you to access and use the leap.fun Platform and leap.fun Services for non-commercial personal use, in accordance with these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">19. Licence of User IP</h2>
            <div className="space-y-4 leading-relaxed">
              <p><strong className="text-foreground">19.1.</strong> You grant to us a perpetual, irrevocable, royalty-free, worldwide and non-exclusive licence to use the User IP to the extent it: (a) forms part of, or is necessary for the use of, any Created IP; and (b) is necessary to allow us to provide you with access to the leap.fun Platform and leap.fun Services.</p>
              <p><strong className="text-foreground">19.2.</strong> The licence granted by you under this clause includes our right to sub-license to a third party to the extent required to enable leap.fun Entities and any affiliates to provide you with access to the leap.fun Platform and to enable use of any leap.fun Services, or any part of them.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">20. Created IP</h2>
            <div className="space-y-4 leading-relaxed">
              <p><strong className="text-foreground">20.1.</strong> The Created IP shall automatically vest in us from time to time on the date on which it is created.</p>
              <p><strong className="text-foreground">20.2.</strong> You hereby assign to us (and agree to procure that any agents, representatives or contractors assign), with full title guarantee, title to all present and future rights and interest in the Created IP.</p>
              <p><strong className="text-foreground">20.3.</strong> If requested to do so, you shall (and agree to procure that any agents, representatives or contractors shall), without charge to us, sign and/or execute all documents and do all such acts as we may require to perfect the assignments under this clause.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">21. General</h2>
            <div className="space-y-4 leading-relaxed">
              <p><strong className="text-foreground">21.1.</strong> You agree and acknowledge that: (i) we are not responsible for any User Material (whether provided by you or by third parties) which may be used on, uploaded to or made available on the leap.fun Platform and leap.fun Services, including user-generated Digital Assets; and (ii) use of any such User Material and user-generated Digital Assets is at your own risk and that we do not provide any warranties in relation to the same.</p>
              <p><strong className="text-foreground">21.2.</strong> We shall have the right at our sole and absolute discretion to remove, modify or reject any content that you submit to, post, use or display on the Platform (including any User Material and user-generated Digital Assets) for any reason. We reserve the right to take any actions as we deem appropriate at our sole discretion, including giving a written warning to you, removing any User Material and user-generated Digital Assets, recovering damages or other monetary compensation from you, suspending or terminating your access to the leap.fun Platform and leap.fun Services. We have the right to restrict or ban you from any and all future use of the leap.fun Platform and leap.fun Services.</p>
              <p><strong className="text-foreground">21.3.</strong> You agree that we may record any communications, electronic, by telephone, over video call, chat, VOIP or otherwise, that we have with you in relation to these Terms, and that any such record that we keep will constitute evidence of the communications between you and us. You agree that telephone conversations and video calls may be recorded so that we can respond to inquiries, ensure compliance with applicable laws, improve our services and provide customer support.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">22. Prohibited Use</h2>
            <p className="leading-relaxed mb-4">
              By using the leap.fun Platform and leap.fun Services, including carrying out any Transaction, and without prejudice to any other restriction or limitation set out in these Terms, you agree that you will not:
            </p>
            <ul className="list-[lower-alpha] list-inside space-y-2 ml-4 leading-relaxed">
              <li>breach these Terms or any agreement entered into pursuant to them;</li>
              <li>use the leap.fun Platform and/or leap.fun Services in a manner that violates our Prohibited Use Policies, including our DMCA Guidelines and/or Trademark Guidelines;</li>
              <li>use the leap.fun Platform and/or leap.fun Services for commercial purposes, including transactions on behalf of other persons or entities, unless expressly agreed by us in writing;</li>
              <li>engage in market manipulation, including pump and dump schemes, wash trading, or any activity designed to control or artificially affect the price of any Digital Asset;</li>
              <li>engage in fraudulent activities, or cause us to suspect that you have done so;</li>
              <li>undertake activities that may result in disputes, chargebacks, penalties, or liability to any party;</li>
              <li>provide false, inaccurate or misleading information in connection with your use;</li>
              <li>use bots, spiders, deep links, or other tools to access or copy data from the leap.fun Platform in unauthorized ways;</li>
              <li>attempt unauthorized access, probe, scan or test vulnerabilities of the Platform;</li>
              <li>reverse-engineer or otherwise attempt to extract source code or intellectual property;</li>
              <li>copy, republish, or otherwise exploit any part of leap.fun IP or services;</li>
              <li>spread malware, spyware, or any software designed to harm systems or users;</li>
              <li>use anonymizing proxies, spoof IPs, or manipulate system behaviors;</li>
              <li>create or purport to create any security interest over your user-generated Digital Assets;</li>
              <li>violate any Applicable Law or third party IP or privacy rights;</li>
              <li>access or attempt to access the leap.fun Platform or Services from any prohibited or sanctioned jurisdictions (including the United States, the United Kingdom, Cuba, Iran, North Korea, Syria, Russia, and any other jurisdiction listed in our List of Prohibited Countries).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">23. Representations and Warranties</h2>
            <p className="leading-relaxed mb-4">You hereby represent and warrant to us, at all times, the following:</p>
            <ul className="list-[lower-alpha] list-inside space-y-2 ml-4 leading-relaxed">
              <li>all decisions made in connection with these Terms were solely and exclusively based on your own judgement;</li>
              <li>you have full power, authority, and capacity to (i) access and use the leap.fun Platform and leap.fun Services; and (ii) enter into and perform your obligations under these Terms;</li>
              <li>where participating in user-generated Digital Assets, you have independently assessed such assets and the underlying Leveraged Tokens and are using no more of your financial resources than is prudent and reasonable;</li>
              <li>all consents, approvals, and registrations required to use the leap.fun Platform and Services have been lawfully obtained;</li>
              <li>you either (i) have enforceable rights to use any images and IP uploaded to the leap.fun Platform, or (ii) have obtained all necessary permissions to do so;</li>
              <li>these Terms constitute valid and legally binding obligations enforceable against you;</li>
              <li>if you are a legal entity, you are duly incorporated and validly existing under your jurisdiction&apos;s laws;</li>
              <li>your access and use of the leap.fun Platform and Services will not: (i) breach your constitutional documents if you are a legal entity; (ii) breach any instrument or agreement you are a party to; and (iii) cause any party to breach any Applicable Law or legal decision.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">24. Technology Disclaimers</h2>
            <div className="space-y-4 leading-relaxed">
              <p><strong className="text-foreground">24.1.</strong> The leap.fun Platform and leap.fun Services are provided on an &quot;as is&quot; and &quot;as available&quot; basis without any representation or warranty, whether express or implied, to the maximum extent permitted by Applicable Law. We specifically disclaim any implied warranties of title, merchantability, fitness for a particular purpose, and non-infringement.</p>
              <p><strong className="text-foreground">24.2.</strong> We do not warrant that access to the leap.fun Platform or Services will be continuous, uninterrupted, timely, or error-free. Delays, service interruptions, and time-sensitive transaction failures may occur.</p>
              <p><strong className="text-foreground">24.3.</strong> Access may be suspended from time to time for scheduled or emergency maintenance. We make no guarantees regarding processing times for Transactions, which may vary due to blockchain conditions or other external factors.</p>
              <p><strong className="text-foreground">24.4.</strong> Although we strive to ensure up-to-date content, we make no representations, warranties, or guarantees that the content on the leap.fun Platform is accurate, complete, or current. This includes, without limitation, Leveraged Token NAV data, leverage decomposition estimates, bonding curve progress, and graduation thresholds.</p>
              <p><strong className="text-foreground">24.5.</strong> Links to third-party websites are provided as a convenience. We do not control and are not responsible for the content or services available on any third-party sites.</p>
              <p><strong className="text-foreground">24.6.</strong> You are responsible for obtaining the necessary network access to use the leap.fun Platform and Services, and for ensuring your devices are compatible. We do not guarantee operation across all devices and platforms.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">25. Indemnity</h2>
            <div className="space-y-4 leading-relaxed">
              <p><strong className="text-foreground">25.1.</strong> You hereby undertake and agree to indemnify us and hold us harmless upon demand from and against any claims, suits, actions, demands, disputes, allegations, or investigations brought by any and all persons or entities, including third-parties, governmental authorities, and industry bodies, as well as all claims, liabilities, damages (actual and consequential), losses (including direct, indirect, or consequential), costs, and expenses, including all interest, penalties and legal or other reasonable attorneys&apos; fees and professional costs (&quot;Losses&quot;), arising out of or in any way connected with:</p>
              <ul className="list-[lower-alpha] list-inside space-y-2 ml-4">
                <li>your access to or use of the leap.fun Platform and leap.fun Services;</li>
                <li>your breach or alleged breach of these Terms;</li>
                <li>your contravention of any Applicable Law; and</li>
                <li>your violation of the rights (intellectual property or otherwise) of any third party.</li>
              </ul>
              <p><strong className="text-foreground">25.2.</strong> You irrevocably and unconditionally agree to release us from any and all claims and demands (and waive any rights you may have now or in the future), arising directly or indirectly out of or in connection with any dispute you have with another user or third party, connected in any way with the leap.fun Platform, leap.fun Services, or these Terms.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">26. Liability</h2>
            <div className="space-y-4 leading-relaxed">
              <p><strong className="text-foreground">26.1.</strong> The leap.fun Entities and affiliates are not responsible for any loss suffered by you or any third party, except where such loss arises solely and directly from our wilful misconduct or actual fraud. We are not liable for any loss related to user-generated Digital Assets or Leveraged Tokens.</p>
              <p><strong className="text-foreground">26.2.</strong> Our total liability to you under any circumstance will not exceed the amount of fees you paid to us for the transaction giving rise to the claim. This amount shall represent full and final settlement of any claim.</p>
              <p><strong className="text-foreground">26.3.</strong> You agree that we are unaware of your specific circumstances and that monetary damages are an adequate remedy. You are not entitled to remedies such as injunction or specific performance.</p>
              <p><strong className="text-foreground">26.4.</strong> We are not liable for:</p>
              <ul className="list-[lower-alpha] list-inside space-y-2 ml-4">
                <li>direct or indirect losses arising from actions, delays, market fluctuations, technical failures, third-party behavior, smart contract execution, Leveraged Token NAV changes, or rebalancing events;</li>
                <li>loss of profits, opportunities, or business due to use or inability to use the leap.fun Platform;</li>
                <li>any error, Manifest Error, market volatility, or cancellation of a transaction;</li>
                <li>any claim brought more than one year after the cause of action arose;</li>
                <li>losses arising from volatility decay, liquidation, or NAV decline of any Leveraged Token, whether or not such Leveraged Token is used as a reserve asset on the leap.fun Platform.</li>
              </ul>
              <p><strong className="text-foreground">26.5.</strong> We are not liable for malware, phishing, or spoofing attacks. You are responsible for using antivirus software and for protecting access credentials to your Wallet and devices.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">27. Governing Law</h2>
            <p className="leading-relaxed">
              Aside from where Applicable Law requires or provides you with a choice otherwise, these Terms (including this arbitration agreement) shall be governed by, and construed in accordance with, the laws of the Cayman Islands.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">28. Dispute Resolution; Arbitration</h2>
            <p className="leading-relaxed font-semibold text-foreground mb-4">
              PLEASE READ THIS SECTION CAREFULLY: IT MAY SIGNIFICANTLY AFFECT YOUR LEGAL RIGHTS, INCLUDING YOUR RIGHT TO FILE A LAWSUIT IN COURT AND TO HAVE A JURY HEAR YOUR CLAIMS. IT CONTAINS PROCEDURES FOR MANDATORY BINDING ARBITRATION AND A CLASS ACTION WAIVER.
            </p>
            <div className="space-y-4 leading-relaxed">
              <p><strong className="text-foreground">28.1. Binding Arbitration.</strong> Except for disputes where we seek injunctive or equitable relief related to intellectual property, you waive your rights to have Disputes adjudicated in court or before a jury. All Disputes must be resolved by binding arbitration.</p>
              <p><strong className="text-foreground">28.2. Informal Dispute Resolution.</strong> You must notify us in writing of any Dispute within thirty (30) days of its arising. You agree to engage in a good faith informal resolution process, including at least one telephonic conference before proceeding to formal arbitration.</p>
              <p><strong className="text-foreground">28.3. Arbitration Process.</strong> Arbitration will be conducted in the Cayman Islands. A single arbitrator with relevant experience will be appointed. English shall be the language of arbitration. Arbitration is private and confidential unless disclosure is legally required.</p>
              <p><strong className="text-foreground">28.4. No Class Actions.</strong> All Disputes must be brought individually. Class arbitrations, class actions, and representative actions are strictly prohibited.</p>
              <p><strong className="text-foreground">28.5. Consolidated Arbitrations.</strong> Arbitrations may be consolidated when appropriate, such as when they share common facts or legal issues.</p>
              <p><strong className="text-foreground">28.6. Mass Arbitrations.</strong> If 25+ similar claims are filed, a batching procedure will apply. Selected test cases will go to arbitration first, followed by mediation. Claims not resolved may return to arbitration in batches or may be opted out for court filing.</p>
              <p><strong className="text-foreground">28.7. Severability.</strong> If any part of this arbitration clause is found unenforceable, the rest will still apply. Waivers are enforceable to the extent permitted by law.</p>
              <p><strong className="text-foreground">28.8. Jurisdiction of Arbitrator.</strong> The arbitrator shall have exclusive authority to determine the scope, validity, and arbitrability of any Dispute.</p>
              <p><strong className="text-foreground">28.9.</strong> These arbitration provisions survive the termination of these Terms.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">29. Contact</h2>
            <div className="space-y-4 leading-relaxed">
              <p><strong className="text-foreground">29.1.</strong> If you have questions, feedback, or complaints you can contact us via our Support team through{' '}
                <a href="mailto:support@leap.fun" className="text-foreground underline hover:text-primary">support@leap.fun</a>.
              </p>
              <p><strong className="text-foreground">29.2.</strong> Where necessary, and in accordance with your Privacy Notice, we will contact you using the details you have provided to us or that we may reasonably find, such as via directly messaging you on X (formerly known as Twitter).</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">30. General Terms</h2>
            <div className="space-y-4 leading-relaxed">
              <p><strong className="text-foreground">30.1.</strong> You must comply with all Applicable Law, licensing requirements, and third-party rights, including data protection and anti-money laundering laws.</p>
              <p><strong className="text-foreground">30.2.</strong> We may give notice to you electronically, including through Telegram or social media. You must provide notice to us as directed in these Terms.</p>
              <p><strong className="text-foreground">30.3.</strong> Official announcements will be made on X (formerly Twitter) from the official leap.fun account.</p>
              <p><strong className="text-foreground">30.4.</strong> These Terms constitute the whole agreement between you and the leap.fun Entities and affiliates.</p>
              <p><strong className="text-foreground">30.5.</strong> You may not assign your rights without our prior written consent. We may assign ours freely.</p>
              <p><strong className="text-foreground">30.6.</strong> If any clause is found invalid, the remainder of the Terms remains in effect.</p>
              <p><strong className="text-foreground">30.7.</strong> We may record communications with you, including calls and messages, as evidence and for support.</p>
              <p><strong className="text-foreground">30.8.</strong> In case of conflict, the English version of the Terms prevails over any translations.</p>
              <p><strong className="text-foreground">30.9.</strong> These Terms do not create third-party beneficiary rights.</p>
              <p><strong className="text-foreground">30.10.</strong> Provisions that naturally survive termination will remain binding.</p>
              <p><strong className="text-foreground">30.11.</strong> These Terms do not establish a partnership, joint venture, or agency relationship.</p>
              <p><strong className="text-foreground">30.12.</strong> We are not liable for delay or failure to perform due to a Force Majeure Event.</p>
              <p><strong className="text-foreground">30.13.</strong> No delay or omission in enforcing rights shall waive future enforcement.</p>
              <p><strong className="text-foreground">30.14.</strong> We may set-off amounts you owe us; you must pay what you owe free from deductions or counterclaims.</p>
              <p><strong className="text-foreground">30.15.</strong> If you receive another user&apos;s information, you must keep it confidential and only use it lawfully.</p>
              <p><strong className="text-foreground">30.16.</strong> If you breach these Terms, we may disclose the breach and related information for user safety.</p>
              <p><strong className="text-foreground">30.17.</strong> You are responsible for determining and paying all applicable taxes related to your use of the leap.fun Platform and Services.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">31. Wallets</h2>
            <div className="space-y-4 leading-relaxed">
              <p><strong className="text-foreground">31.1.</strong> The Wallet that you connect to the leap.fun Platform is provided by third-party wallet providers and shall remain the responsibility of such providers and you. You acknowledge that third-party wallet providers are not affiliated with any leap.fun Entities or affiliates and you are solely responsible for reading and understanding the relevant wallet provider&apos;s terms and conditions. leap.fun Entities and affiliates have no control over your Wallet, however generated, or the private keys to it.</p>
              <p><strong className="text-foreground">31.2.</strong> None of the leap.fun Entities or affiliates shall be responsible for the operation or features of the Wallet or be liable for any losses or damage incurred or suffered directly or indirectly as a result of using the Wallet.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">32. Definitions and Interpretation</h2>
            <p className="leading-relaxed mb-4">In these Terms:</p>
            <div className="space-y-4 leading-relaxed">
              <p><strong className="text-foreground">32.1.</strong> Clause headings and numbering are for convenience only and do not affect the meaning or interpretation.</p>
              <p><strong className="text-foreground">32.2.</strong> &quot;Include&quot; and &quot;including&quot; mean without limitation.</p>
              <p><strong className="text-foreground">32.3.</strong> Any obligation not to do something includes not permitting it to be done.</p>
              <p><strong className="text-foreground">32.4.</strong> Words in the singular include the plural and vice versa; words referring to gender include all genders.</p>
              <p><strong className="text-foreground">32.5.</strong> References to documents include any variations or amendments not in breach of these Terms.</p>
              <p><strong className="text-foreground">32.6.</strong> In case of inconsistency: (a) the Privacy Notice prevails over these Terms; (b) these Terms prevail over any other referenced documents unless otherwise stated.</p>
              <p><strong className="text-foreground">32.7.</strong> Capitalized terms shall have the meanings assigned in the Terms unless context requires otherwise.</p>
            </div>
            <h3 className="text-lg font-medium text-foreground mt-6 mb-4">Defined Terms</h3>
            <dl className="space-y-4 leading-relaxed">
              {[
                ['Activity History', 'The record of your Transactions and activity on the leap.fun Platform and Services.'],
                ['Applicable Law', 'All relevant laws, regulations, rules, and legal requirements in any jurisdiction applicable to the provision or use of the leap.fun Platform or Services.'],
                ['Bonding Curve', 'The automated pricing mechanism used by the leap.fun Platform to determine the price of User-Generated Digital Assets based on supply, denominated in Leveraged Tokens.'],
                ['Claim', 'Any dispute or legal controversy between you and leap.fun Entities relating to these Terms, your use of the platform, or related non-contractual obligations.'],
                ['Control', 'Power to direct the affairs of an entity, including majority ownership, board appointment rights, or equivalent authority.'],
                ['Digital Assets', 'Digitally represented value stored and transferred via distributed ledger technologies, including cryptocurrencies, NFTs, and tokenized derivatives.'],
                ['Force Majeure Event', 'Unforeseeable circumstances that prevent us from fulfilling our obligations — e.g., natural disasters, war, pandemics, or major technical failures.'],
                ['Graduation', 'The process by which a User-Generated Digital Asset\'s bonding curve reaches its target USD value and liquidity is migrated to a third-party decentralised exchange as a token/LT trading pair.'],
                ['Improper Intent', 'Behavior deemed fraudulent, abusive, or manipulative by leap.fun, including unfair advantages and market manipulation.'],
                ['Instruction', 'Any command submitted by you to the leap.fun Platform to execute a Transaction.'],
                ['Intellectual Property Rights', 'Includes copyrights, patents, trademarks, design rights, and any other similar rights worldwide.'],
                ['Leveraged Token (LT)', 'A Digital Asset issued by a third-party protocol whose value is derived from leveraged exposure to an underlying asset via perpetual futures contracts.'],
                ['List of Prohibited Countries', 'High-risk or sanctioned jurisdictions including the United States, the United Kingdom, Cuba, Iran, North Korea, Syria, Russia, and others as determined by leap.fun from time to time.'],
                ['Losses', 'As defined in Clause 25.1, includes direct and indirect damages, costs, and legal fees.'],
                ['Manifest Error', 'Obvious mistakes in data or actions that are clear and indisputable.'],
                ['Network Event', 'Events on a blockchain (e.g., 51% attacks or chain reorganisations) that compromise Digital Asset records or control.'],
                ['Privacy Notice', 'The document outlining how we collect, use, and protect your personal data.'],
                ['leap.fun Entity', 'the entities and affiliates behind the leap.fun Platform and Services.'],
                ['leap.fun IP', 'All intellectual property owned or licensed by leap.fun Entities related to the leap.fun Platform and Services.'],
                ['leap.fun Platform', 'The digital interface and system through which users access leap.fun Services, including the website and any associated applications.'],
                ['leap.fun Services', 'Tools and offerings provided by leap.fun, such as digital asset creation, bonding curve trading, graduation, and related services.'],
                ['Regulatory Authority', 'Any relevant national or international regulator, court, tax authority, or government body.'],
                ['Security Breach', 'Any unauthorized access or cyberattack affecting you, leap.fun, or the leap.fun Services.'],
                ['Terms', 'The full Terms of Use agreement, including referenced documents and future amendments.'],
                ['Trade Marks', 'All logos, branding, and service marks used in connection with the leap.fun Platform.'],
                ['Transaction', 'The creation, buying, or selling of Digital Assets on or through the leap.fun Platform.'],
                ['User-Created IP', 'Intellectual property created by you using the leap.fun Platform, except for content created prior to acceptance of these Terms.'],
                ['User-Generated Digital Asset', 'A Digital Asset created by a user via leap.fun Services, which trades on a bonding curve denominated in Leveraged Tokens.'],
                ['User Materials', 'All content (e.g., Digital Assets, posts, images) that you upload or create via the leap.fun Platform.'],
                ['Wallet', 'The digital wallet you connect to the leap.fun Platform for interacting with the HyperEVM blockchain.'],
                ['Website', 'The official leap.fun website.'],
              ].map(([term, definition]) => (
                <div key={term}>
                  <dt className="font-medium text-foreground">{term}</dt>
                  <dd className="mt-1">{definition}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
