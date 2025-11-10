// React needed for JSX transform at runtime
// @ts-ignore TS6133 - React required for JSX but appears unused
import * as React from 'react'
import {
	Document,
	Page,
	Text,
	View,
	StyleSheet
} from '@react-pdf/renderer'
import type { LeaseGenerationFormData } from '@repo/shared/validation/lease-generation.schemas'

// Register fonts (optional - uses default if not specified)
// Font.register({
// 	family: 'Roboto',
// 	src: 'https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Mu4mxP.ttf'
// })

const styles = StyleSheet.create({
	page: {
		padding: 50,
		fontSize: 11,
		lineHeight: 1.6,
		fontFamily: 'Helvetica'
	},
	title: {
		fontSize: 16,
		fontWeight: 'bold',
		textAlign: 'center',
		marginBottom: 20,
		textDecoration: 'underline'
	},
	section: {
		marginBottom: 15
	},
	sectionTitle: {
		fontSize: 11,
		fontWeight: 'bold',
		marginBottom: 5
	},
	paragraph: {
		marginBottom: 10,
		textAlign: 'justify'
	},
	subsection: {
		marginLeft: 20,
		marginBottom: 8
	},
	bold: {
		fontWeight: 'bold'
	},
	signatureSection: {
		marginTop: 30,
		marginBottom: 15
	},
	signatureLine: {
		borderBottomWidth: 1,
		borderBottomColor: '#000',
		width: 300,
		marginTop: 20,
		marginBottom: 5
	}
})

interface TexasLeaseTemplateProps {
	data: LeaseGenerationFormData
}

export function TexasLeaseTemplate({
	data
}: TexasLeaseTemplateProps) {
	// Format date helper
	const formatDate = (dateStr: string) => {
		const date = new Date(dateStr)
		return date.toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		})
	}

	// Extract day/month/year for agreement date
	const agreementDate = new Date(data.agreementDate)
	const agreementDay = agreementDate.getDate()
	const agreementMonth = agreementDate.toLocaleDateString('en-US', {
		month: 'long'
	})
	const agreementYear = agreementDate.getFullYear()

	// Calculate hold over rent
	const holdOverRent = data.monthlyRent * data.holdOverRentMultiplier

	return (
		<Document>
			<Page size="A4" style={styles.page}>
				<Text style={styles.title}>Texas Residential Lease Agreement</Text>

				<View style={styles.section}>
					<Text style={styles.paragraph}>
						THIS AGREEMENT (hereinafter referred to as the "Texas Lease
						Agreement") is made and entered into this {agreementDay} day of{' '}
						{agreementMonth}, {agreementYear}, by and between {data.ownerName}{' '}
						(hereinafter referred to as "Landlord") and {data.tenantName}{' '}
						(hereinafter referred to as "Tenant.") For and in consideration of the
						covenants and obligations contained herein and other good and valuable
						consideration, the receipt and sufficiency of which is hereby
						acknowledged, the parties hereto hereby agree as follows:
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>1. PROPERTY.</Text>
					<Text style={styles.paragraph}>
						Landlord owns certain real property and improvements located at{' '}
						{data.propertyAddress} (hereinafter referred to as the "Property").
						Landlord desires to lease the Premises to Tenant upon the terms and
						conditions contained herein. Tenant desires to lease the Premises from
						Landlord on the terms and conditions as contained herein.
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>2. TERM.</Text>
					<Text style={styles.paragraph}>
						This Texas Lease Agreement shall commence on{' '}
						{formatDate(data.commencementDate)} and shall continue as a lease for
						term. The termination date shall be on{' '}
						{formatDate(data.terminationDate)} at 11:59 PM. Upon termination date,
						Tenant shall be required to vacate the Premises unless one of the
						following circumstances occur:
					</Text>
					<View style={styles.subsection}>
						<Text style={styles.paragraph}>
							(i) Landlord and Tenant formally extend this Texas Lease Agreement in
							writing or create and execute a new, written, and signed Texas Lease
							Agreement; or
						</Text>
						<Text style={styles.paragraph}>
							(ii) Landlord willingly accepts new Rent from Tenant, which does not
							constitute past due Rent.
						</Text>
					</View>
					<Text style={styles.paragraph}>
						In the event that Landlord accepts new rent from Tenant after the
						termination date, a month-to-month tenancy shall be created. If at any
						time either party desires to terminate the month-to-month tenancy, such
						party may do so by providing to the other party written notice of
						intention to terminate at least 30 days prior to the desired date of
						termination of the month-to-month tenancy.
					</Text>
					<Text style={styles.paragraph}>
						Notices to terminate may be given on any calendar day, irrespective of
						Commencement Date. Rent shall continue at the rate specified in this
						Texas Lease Agreement, or as allowed by law. All other terms and
						conditions as outlined in this Texas Lease Agreement shall remain in
						full force and effect. Time is of the essence for providing notice of
						termination (strict compliance with dates by which notice must be
						provided is required).
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>3. RENT.</Text>
					<Text style={styles.paragraph}>
						Tenant shall pay to Landlord the sum of ${data.monthlyRent.toFixed(2)}{' '}
						per month as Rent for the Term of the Agreement. Due date for Rent
						payment shall be the {data.rentDueDay}
						{data.rentDueDay === 1
							? 'st'
							: data.rentDueDay === 2
								? 'nd'
								: data.rentDueDay === 3
									? 'rd'
									: 'th'}{' '}
						day of each calendar month and shall be considered advance payment for
						that month. Weekends and holidays do not delay or excuse Tenant's
						obligation to timely pay rent.
					</Text>

					<View style={styles.subsection}>
						<Text style={styles.sectionTitle}>A. Delinquent Rent.</Text>
						<Text style={styles.paragraph}>
							If not paid on the {data.rentDueDay}
							{data.rentDueDay === 1 ? 'st' : 'th'}, Rent shall be considered
							overdue and delinquent on the{' '}
							{data.rentDueDay === 1 ? '2nd' : `${data.rentDueDay + 1}th`} day of
							each calendar month. If Tenant fails to timely pay any month's rent,
							Tenant will pay Landlord a late charge of $
							{data.lateFeeAmount ? data.lateFeeAmount.toFixed(2) : '0.00'} per day until rent is paid
							in full. If Landlord receives the monthly rent by the{' '}
							{data.lateFeeGraceDays + 1}
							{data.lateFeeGraceDays + 1 === 3 ? 'rd' : 'th'} day of the month,
							Landlord will waive the late charges for that month. Any waiver of
							late charges under this paragraph will not affect or diminish any
							other right or remedy Landlord may exercise for Tenant's failure to
							timely pay rent.
						</Text>
					</View>

					<View style={styles.subsection}>
						<Text style={styles.sectionTitle}>B. Prorated Rent.</Text>
						<Text style={styles.paragraph}>
							In the event that the Commencement Date is not the 1st of the calendar
							month, Rent payment remitted on the Commencement Date shall be
							prorated based on a 30-day period.
						</Text>
					</View>

					<View style={styles.subsection}>
						<Text style={styles.sectionTitle}>C. Returned Checks.</Text>
						<Text style={styles.paragraph}>
							In the event that any payment by Tenant is returned for insufficient
							funds ("NSF") or if Tenant stops payment, Tenant will pay $
							{data.nsfFee.toFixed(2)} to Landlord for each such check, plus late
							charges, as described above, until Landlord has received payment.
							Furthermore, Landlord may require in writing that Tenant pay all future
							Rent payments by cash, money order, or cashier's check.
						</Text>
					</View>

					<View style={styles.subsection}>
						<Text style={styles.sectionTitle}>D. Order in which funds are applied.</Text>
						<Text style={styles.paragraph}>
							Landlord will apply all funds received from Tenant first to any
							non-rent obligations of Tenant including late charges, returned check
							charges, charge-backs for repairs, brokerage fees, and periodic
							utilities, then to rent, regardless of any notations on a check.
						</Text>
					</View>

					<View style={styles.subsection}>
						<Text style={styles.sectionTitle}>E. Rent Increases.</Text>
						<Text style={styles.paragraph}>
							There will be no rent increases through the Termination Date. If this
							lease is renewed automatically on a month to month basis, Landlord may
							increase the rent during the renewal period by providing written notice
							to Tenant that becomes effective the month following the 30th day after
							the notice is provided.
						</Text>
					</View>
				</View>
			</Page>

			{/* Page 2 */}
			<Page size="A4" style={styles.page}>
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>4. SECURITY DEPOSIT.</Text>
					<Text style={styles.paragraph}>
						Upon execution of this Texas Lease Agreement, Tenant shall deposit with
						Landlord the sum of ${data.securityDeposit.toFixed(2)}, receipt of
						which is hereby acknowledged by Landlord, as security for any damage
						caused to the Premises during the term hereof.
					</Text>

					<Text style={styles.sectionTitle}>REFUND OF SECURITY DEPOSIT.</Text>
					<Text style={styles.paragraph}>
						Upon termination of the tenancy, all funds held by the landlord as
						security deposit may be applied to the payment of accrued rent and the
						amount of damages that the landlord has suffered by reason of the
						tenant's noncompliance with the terms of this Texas Lease Agreement or
						with any and all laws, ordinances, rules and orders of any and all
						governmental or quasi-governmental authorities affecting the cleanliness,
						use, occupancy and preservation of the Premises.
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>5. USE OF PREMISES.</Text>
					<Text style={styles.paragraph}>
						The Premises shall be used and occupied solely by Tenant and Tenant's
						immediate family, consisting of{' '}
						{data.maxOccupants ? `${data.maxOccupants} persons` : 'Tenant only'},
						exclusively, as a private single family dwelling, and no part of the
						Premises shall be used at any time during the term of this Texas Lease
						Agreement by Tenant for the purpose of carrying on any business,
						profession, or trade of any kind, or for any purpose other than as a
						private single family dwelling. {data.allowedUse}
					</Text>
					<Text style={styles.paragraph}>
						Tenant shall not allow any other person, other than Tenant's immediate
						family or transient relatives and friends who are guests of Tenant, to
						use or occupy the Premises without first obtaining Landlord's written
						consent to such use. Tenant shall comply with any and all laws,
						ordinances, rules and orders of any and all governmental or
						quasi-governmental authorities affecting the cleanliness, use, occupancy
						and preservation of the Premises.
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>6. CONDITION OF PREMISES.</Text>
					<Text style={styles.paragraph}>
						Tenant stipulates, represents and warrants that Tenant has examined the
						Premises, and that they are at the time of this Lease in good order,
						repair, and in a safe, clean and tenantable condition.
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>7. ASSIGNMENT AND SUB-LETTING.</Text>
					<Text style={styles.paragraph}>
						Tenant shall not assign this Texas Lease Agreement, or sub-let or grant
						any license to use the Premises or any part thereof without the prior
						written consent of Landlord. A consent by Landlord to one such
						assignment, sub-letting or license shall not be deemed to be a consent to
						any subsequent assignment, sub-letting or license. An assignment,
						sub-letting or license without the prior written consent of Landlord or
						an assignment or sub-letting by operation of law shall be absolutely null
						and void and shall, at Landlord's option, terminate this Texas Lease
						Agreement.
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>8. ALTERATIONS AND IMPROVEMENTS.</Text>
					<Text style={styles.paragraph}>
						Tenant shall make no alterations to the buildings or improvements on the
						Premises or construct any building or make any other improvements on the
						Premises without the prior written consent of Landlord. Any and all
						alterations, changes, and/or improvements built, constructed or placed on
						the Premises by Tenant shall, unless otherwise provided by written
						agreement between Landlord and Tenant, be and become the property of
						Landlord and remain on the Premises at the expiration or earlier
						termination of this Texas Lease Agreement.
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>9. NON-DELIVERY OF POSSESSION.</Text>
					<Text style={styles.paragraph}>
						In the event Landlord cannot deliver possession of the Premises to Tenant
						upon the commencement of the Lease term, through no fault of Landlord or
						its agents, then Landlord or its agents shall have no liability, but the
						rental herein provided shall abate until possession is given. Landlord or
						its agents shall have thirty (30) days in which to give possession, and
						if possession is tendered within such time, Tenant agrees to accept the
						demised Premises and pay the rental herein provided from that date. In
						the event possession cannot be delivered within such time, through no
						fault of Landlord or its agents, then this Texas Lease Agreement and all
						rights hereunder shall terminate.
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>10. HAZARDOUS MATERIALS.</Text>
					<Text style={styles.paragraph}>
						Tenant shall not keep on the Premises any item of a dangerous, flammable
						or explosive character that might unreasonably increase the danger of fire
						or explosion on the Premises or that might be considered hazardous or
						extra hazardous by any responsible insurance company.
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>11. UTILITIES.</Text>
					<Text style={styles.paragraph}>
						Tenant shall be responsible for arranging for and paying for{' '}
						{data.tenantResponsibleUtilities?.length
							? data.tenantResponsibleUtilities.join(', ')
							: 'all'}{' '}
						utility services required on the Premises.
						{data.utilitiesIncluded?.length
							? ` Landlord will pay for ${data.utilitiesIncluded.join(', ')}.`
							: ''}
					</Text>
				</View>
			</Page>

			{/* Page 3 - Maintenance */}
			<Page size="A4" style={styles.page}>
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>
						12. MAINTENANCE, REPAIR, AND RULES.
					</Text>
					<Text style={styles.paragraph}>
						Tenant will, at its sole expense, keep and maintain the Premises and
						appurtenances in good and sanitary condition and repair during the term
						of this Texas Lease Agreement and any renewal thereof. Without limiting
						the generality of the foregoing, Tenant shall:
					</Text>

					<View style={styles.subsection}>
						<Text style={styles.paragraph}>
							A. Not obstruct the driveways, sidewalks, courts, entry ways, stairs
							and/or halls, which shall be used for the purposes of ingress and
							egress only;
						</Text>
						<Text style={styles.paragraph}>
							B. Keep all windows, glass, window coverings, doors, locks and hardware
							in good, clean order and repair;
						</Text>
						<Text style={styles.paragraph}>
							C. Not obstruct or cover the windows or doors;
						</Text>
						<Text style={styles.paragraph}>
							D. Not leave windows or doors in an open position during any inclement
							weather;
						</Text>
						<Text style={styles.paragraph}>
							E. Not hang any laundry, clothing, sheets, etc., from any window, rail,
							porch or balcony nor air or dry any of same within any yard area or
							space;
						</Text>
						<Text style={styles.paragraph}>
							F. Not cause or permit any locks or hooks to be placed upon any door or
							window without the prior written consent of Landlord;
						</Text>
						<Text style={styles.paragraph}>
							G. Keep all air conditioning filters clean and free from dirt;
						</Text>
						<Text style={styles.paragraph}>
							H. Keep all lavatories, sinks, toilets, and all other water and plumbing
							apparatus in good order and repair and shall use same only for the
							purposes for which they were constructed. Tenant shall not allow any
							sweepings, rubbish, sand, rags, ashes or other substances to be thrown
							or deposited therein. Any damage to any such apparatus and the cost of
							clearing stopped plumbing resulting from misuse shall be borne by
							Tenant;
						</Text>
						<Text style={styles.paragraph}>
							I. Tenant's family and guests shall at all times maintain order in the
							Premises and at all places on the Premises, and shall not make or permit
							any loud or improper noises, or otherwise disturb other residents;
						</Text>
						<Text style={styles.paragraph}>
							J. Keep all radios, television sets, stereos, phonographs, etc., turned
							down to a level of sound that does not annoy or interfere with other
							residents;
						</Text>
						<Text style={styles.paragraph}>
							K. Deposit all trash, garbage, rubbish or refuse in the locations
							provided and shall not allow any trash, garbage, rubbish or refuse to be
							deposited or permitted to stand on the exterior of any building or within
							the common elements;
						</Text>
						<Text style={styles.paragraph}>
							L. Abide by and be bound by any and all rules and regulations affecting
							the Premises or the common area appurtenant thereto which may be adopted
							or promulgated by the Condominium or Homeowners' Association having
							control over them.
						</Text>
					</View>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>13. DAMAGE TO PREMISES.</Text>
					<Text style={styles.paragraph}>
						In the event the Premises are destroyed or rendered wholly uninhabitable
						by fire, storm, earthquake, or other casualty not caused by the negligence
						of Tenant, this Texas Lease Agreement shall terminate from such time
						except for the purpose of enforcing rights that may have then accrued
						hereunder. The rental provided for herein shall then be accounted for by
						and between Landlord and Tenant up to the time of such injury or
						destruction of the Premises, Tenant paying rentals up to such date and
						Landlord refunding rentals collected beyond such date. Should a portion of
						the Premises thereby be rendered uninhabitable, the Landlord shall have
						the option of either repairing such injured or damaged portion or
						terminating this Lease. In the event that Landlord exercises its right to
						repair such uninhabitable portion, the rental shall abate in the
						proportion that the injured parts bears to the whole Premises, and such
						part so injured shall be restored by Landlord as speedily as practicable,
						after which the full rent shall recommence and the Texas Lease Agreement
						continue according to its terms.
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>14. ACCESS BY LANDLORD.</Text>
					<Text style={styles.paragraph}>
						Landlord and Landlord's agents shall have the right at all reasonable
						times, and by all reasonable means, without notice, during the term of
						this Texas Lease Agreement and any renewal thereof to enter the Premises
						for the following purposes:
					</Text>
					<View style={styles.subsection}>
						<Text style={styles.paragraph}>A. Inspect the Property for condition;</Text>
						<Text style={styles.paragraph}>B. Make repairs;</Text>
						<Text style={styles.paragraph}>
							C. Show the Property to prospective tenants, prospective purchasers,
							inspectors, fire marshals, lenders, appraisers, or insurance agents;
						</Text>
						<Text style={styles.paragraph}>D. Exercise a contractual or statutory lien;</Text>
						<Text style={styles.paragraph}>E. Leave written notice;</Text>
						<Text style={styles.paragraph}>F. Seize nonexempt property after default.</Text>
					</View>
					<Text style={styles.paragraph}>
						Landlord may prominently display a "For Sale" or "For Lease" or similarly
						worded sign on the Property during the term of this Lease or any renewal
						period. If Tenant fails to permit reasonable access under this Paragraph,
						Tenant will be in default.
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>15. SUBORDINATION OF LEASE.</Text>
					<Text style={styles.paragraph}>
						This Texas Lease Agreement and Tenant's interest hereunder are and shall
						be subordinate, junior and inferior to any and all mortgages, liens or
						encumbrances now or hereafter placed on the Premises by Landlord, all
						advances made under any such mortgages, liens or encumbrances (including,
						but not limited to, future advances), the interest payable on such
						mortgages, liens or encumbrances and any and all renewals, extensions or
						modifications of such mortgages, liens or encumbrances.
					</Text>
				</View>
			</Page>

			{/* Page 4 - Hold Over, Animals, etc. */}
			<Page size="A4" style={styles.page}>
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>16. TENANT'S HOLD OVER.</Text>
					<Text style={styles.paragraph}>
						If Tenant remains in possession of the Premises with the consent of
						Landlord after the natural expiration of this Texas Lease Agreement, a new
						tenancy from month-to-month shall be created between Landlord and Tenant
						which shall be subject to all of the terms and conditions hereof except
						that rent shall then be due and owing at ${holdOverRent.toFixed(2)} per
						month and except that such tenancy shall be terminable upon fifteen (15)
						days written notice served by either party.
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>17. SURRENDER OF PREMISES.</Text>
					<Text style={styles.paragraph}>
						Upon the expiration of the term hereof, Tenant shall surrender the
						Premises in as good a state and condition as they were at the commencement
						of this Texas Lease Agreement, reasonable use and wear and tear thereof
						and damages by the elements excepted.
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>18. ANIMALS.</Text>
					<Text style={styles.paragraph}>
						{data.petsAllowed
							? `Pets are permitted on the Premises with a pet deposit of $${data.petDeposit.toFixed(2)} and monthly pet rent of $${data.petRent.toFixed(2)}.`
							: 'THERE WILL BE NO ANIMALS, unless authorized by a separate written Pet Addendum to this Residential Lease Agreement. Tenant shall not permit any animal, including mammals, reptiles, birds, fish, rodents, or insects on the property, even temporarily, unless otherwise agreed by a separate written Pet Agreement.'}{' '}
						If tenant violates the pet restrictions of this Lease, Tenant will pay to
						Landlord a fee of ${data.petDeposit.toFixed(2)} per day per animal for
						each day Tenant violates the animal restrictions as additional rent for any
						unauthorized animal. Landlord may remove or cause to be removed any
						unauthorized animal and deliver it to appropriate local authorities by
						providing at least 24-hour written notice to Tenant of Landlord's intention
						to remove the unauthorized animal. Landlord will not be liable for any
						harm, injury, death, or sickness to any unauthorized animal. Tenant is
						responsible and liable for any damage or required cleaning to the Property
						caused by any unauthorized animal and for all costs Landlord may incur in
						removing or causing any unauthorized animal to be removed.
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>19. WATERBEDS.</Text>
					<Text style={styles.paragraph}>
						THERE WILL BE NO WATERBEDS, unless authorized by a separate written
						Waterbed Addendum to this Residential Lease Agreement.
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>20. QUIET ENJOYMENT.</Text>
					<Text style={styles.paragraph}>
						Tenant, upon payment of all of the sums referred to herein as being
						payable by Tenant and Tenant's performance of all Tenant's agreements
						contained herein and Tenant's observance of all rules and regulations,
						shall and may peacefully and quietly have, hold and enjoy said Premises for
						the term hereof.
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>21. INDEMNIFICATION.</Text>
					<Text style={styles.paragraph}>
						Landlord shall not be liable for any damage or injury of or to the Tenant,
						Tenant's family, guests, invitees, agents or employees or to any person
						entering the Premises or the building of which the Premises are a part or
						to goods or equipment, or in the structure or equipment of the structure of
						which the Premises are a part, and Tenant hereby agrees to indemnify,
						defend and hold Landlord harmless from any and all claims or assertions of
						every kind and nature.
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>22. DEFAULT.</Text>
					<Text style={styles.paragraph}>
						If Landlord breaches this Lease, Tenant may seek any relief provided by
						law. If Tenant fails to comply with any of the material provisions of this
						Texas Lease Agreement, other than the covenant to pay rent, or of any
						present rules and regulations or any that may be hereafter prescribed by
						Landlord, or materially fails to comply with any duties imposed on Tenant
						by statute, within seven (7) days after delivery of written notice by
						Landlord specifying the non-compliance and indicating the intention of
						Landlord to terminate the Lease by reason thereof, Landlord may terminate
						this Texas Lease Agreement. If Tenant fails to pay rent when due and the
						default continues for seven (7) days thereafter, Landlord may, at
						Landlord's option, declare the entire balance of rent payable hereunder to
						be immediately due and payable and may exercise any and all rights and
						remedies available to Landlord at law or in equity or may immediately
						terminate this Texas Lease Agreement.
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>23. ABANDONMENT.</Text>
					<Text style={styles.paragraph}>
						If at any time during the term of this Texas Lease Agreement Tenant
						abandons the Premises or any part thereof, Landlord may, at Landlord's
						option, obtain possession of the Premises in the manner provided by law,
						and without becoming liable to Tenant for damages or for any payment of any
						kind whatever. Landlord may, at Landlord's discretion, as agent for Tenant,
						relet the Premises, or any part thereof, for the whole or any part thereof,
						for the whole or any part of the then unexpired term, and may receive and
						collect all rent payable by virtue of such reletting, and, at Landlord's
						option, hold Tenant liable for any difference between the rent that would
						have been payable under this Texas Lease Agreement during the balance of
						the unexpired term, if this Texas Lease Agreement had continued in force,
						and the net rent for such period realized by Landlord by means of such
						reletting.
					</Text>
				</View>
			</Page>

			{/* Page 5 - Final Terms */}
			<Page size="A4" style={styles.page}>
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>24. ATTORNEYS' FEES.</Text>
					<Text style={styles.paragraph}>
						Should it become necessary for Landlord to employ an attorney to enforce
						any of the conditions or covenants hereof, including the collection of
						rentals or gaining possession of the Premises, Tenant agrees to pay all
						expenses so incurred, including a reasonable attorneys' fee.
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>
						25. RECORDING OF TEXAS LEASE AGREEMENT.
					</Text>
					<Text style={styles.paragraph}>
						Tenant shall not record this Texas Lease Agreement on the Public Records of
						any public office. In the event that Tenant shall record this Texas Lease
						Agreement, this Texas Lease Agreement shall, at Landlord's option,
						terminate immediately and Landlord shall be entitled to all rights and
						remedies that it has at law or in equity.
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>26. GOVERNING LAW.</Text>
					<Text style={styles.paragraph}>
						This Texas Lease Agreement shall be governed, construed and interpreted by,
						through and under the Laws of the State of Texas.
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>27. SEVERABILITY.</Text>
					<Text style={styles.paragraph}>
						If any provision of this Texas Lease Agreement or the application thereof
						shall, for any reason and to any extent, be invalid or unenforceable,
						neither the remainder of this Texas Lease Agreement nor the application of
						the provision to other persons, entities or circumstances shall be affected
						thereby, but instead shall be enforced to the maximum extent permitted by
						law.
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>28. BINDING EFFECT.</Text>
					<Text style={styles.paragraph}>
						The covenants, obligations and conditions herein contained shall be binding
						on and inure to the benefit of the heirs, legal representatives, and
						assigns of the parties hereto.
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>29. DESCRIPTIVE HEADINGS.</Text>
					<Text style={styles.paragraph}>
						The descriptive headings used herein are for convenience of reference only
						and they are not intended to have any effect whatsoever in determining the
						rights or obligations of the Landlord or Tenant.
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>30. CONSTRUCTION.</Text>
					<Text style={styles.paragraph}>
						The pronouns used herein shall include, where appropriate, either gender or
						both, singular and plural.
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>31. NON-WAIVER.</Text>
					<Text style={styles.paragraph}>
						No delay, indulgence, waiver, non-enforcement, election or non-election by
						Landlord under this Texas Lease Agreement will be deemed to be a waiver of
						any other breach by Tenant, nor shall it affect Tenant's duties,
						obligations, and liabilities hereunder.
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>32. MODIFICATION.</Text>
					<Text style={styles.paragraph}>
						The parties hereby agree that this document contains the entire agreement
						between the parties and this Texas Lease Agreement shall not be modified,
						changed, altered or amended in any way except through a written amendment
						signed by all of the parties hereto.
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>33. NOTICE.</Text>
					<Text style={styles.paragraph}>
						Any notice required or permitted under this Lease or under state law shall
						be delivered to Tenant at the Property address, and to Landlord at the
						following address: {data.noticeAddress || data.ownerAddress}
						{data.noticeEmail ? `, Email: ${data.noticeEmail}` : ''}
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>34. LEAD-BASED PAINT DISCLOSURE.</Text>
					<Text style={styles.paragraph}>
						{data.propertyBuiltBefore1978
							? 'If the premises were constructed prior to 1978, Tenant acknowledges receipt of the form entitled "LEAD-BASED PAINT DISCLOSURE" which contains disclosure of information on lead-based paint and/or lead-based paint hazards.'
							: 'The premises were constructed after 1978, therefore lead-based paint disclosure is not required.'}
					</Text>
				</View>

				{/* Signature Section */}
				<View style={styles.signatureSection}>
					<Text style={styles.paragraph}>
						As to Landlord this {agreementDay} day of {agreementMonth},{' '}
						{agreementYear}.
					</Text>
					<Text style={styles.bold}>LANDLORD:</Text>
					<View style={styles.signatureLine} />
					<Text>Signature</Text>
					<Text style={{ marginTop: 10 }}>Print: {data.ownerName}</Text>
					<Text>Date: {formatDate(data.agreementDate)}</Text>
				</View>

				<View style={styles.signatureSection}>
					<Text style={styles.paragraph}>
						As to Tenant, this {agreementDay} day of {agreementMonth},{' '}
						{agreementYear}.
					</Text>
					<Text style={styles.bold}>TENANT:</Text>
					<View style={styles.signatureLine} />
					<Text>Signature</Text>
					<Text style={{ marginTop: 10 }}>Print: {data.tenantName}</Text>
					<Text>Date: {formatDate(data.agreementDate)}</Text>
				</View>
			</Page>
		</Document>
	)
}
