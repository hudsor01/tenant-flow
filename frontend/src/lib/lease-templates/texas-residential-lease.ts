/**
 * Texas Residential Lease Agreement Template
 * Based on standard Texas Association of Realtors lease forms
 */

import type { LeaseGeneratorForm } from '@/types/lease-generator'

export interface TexasLeaseData extends LeaseGeneratorForm {
	// Additional Texas-specific fields
	countyName: string
	emergencyContact?: {
		name: string
		phone: string
		relationship: string
	}
	occupancyLimits?: {
		maxOccupants: number
		childrenUnder2: boolean
	}
	keyDeposit?: number
	petDetails?: {
		type: string
		breed: string
		weight: string
		registration: string
	}
	parkingSpaces?: number
	storageUnit?: string
	moveInDate?: string
	prorationAmount?: number
}

export function generateTexasLeaseHTML(data: TexasLeaseData): string {
	const formatDate = (dateStr: string) => {
		const date = new Date(dateStr)
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	}

	// const formatCurrency = (amount: number) => {
	//   return new Intl.NumberFormat('en-US', {
	//     style: 'currency',
	//     currency: 'USD'
	//   }).format(amount);
	// };

	const formatDateForSignature = (dateStr: string) => {
		const date = new Date(dateStr)
		return {
			day: date.getDate(),
			month: date.toLocaleDateString('en-US', { month: 'long' }),
			year: date.getFullYear()
		}
	}

	const fullAddress = `${data.propertyAddress}${data.unitNumber ? `, ${data.unitNumber}` : ''}`
	const tenantList = data.tenantNames.join(' and ')
	const signatureDate = formatDateForSignature(data.leaseStartDate)
	const holdOverRent = Math.round(data.rentAmount * 1.1) // 10% increase for holdover
	const lateFeePerDay = data.lateFeeAmount
	const nsfFee = data.lateFeeAmount || 50 // Default NSF fee
	const petFeePerDay = data.petDeposit || 25 // Default pet violation fee
	const familyMembers =
		data.tenantNames.length > 1 ? data.tenantNames.slice(1).join(', ') : ''

	return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Texas Residential Lease Agreement</title>
    <style>
        body {
            font-family: 'Times New Roman', serif;
            font-size: 11px;
            line-height: 1.3;
            margin: 0.75in;
            color: #000;
            text-align: justify;
        }
        .header {
            text-align: center;
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 15px;
        }
        .form-line {
            border-bottom: 1px solid #000;
            min-height: 14px;
            display: inline-block;
            min-width: 80px;
            margin: 0 1px;
            padding: 0 2px;
            font-weight: bold;
        }
        .signature-line {
            border-bottom: 1px solid #000;
            width: 300px;
            height: 16px;
            display: inline-block;
            margin: 0 5px;
        }
        .date-line {
            border-bottom: 1px solid #000;
            width: 120px;
            height: 14px;
            display: inline-block;
            margin: 0 5px;
        }
        .section {
            margin: 12px 0;
            text-align: justify;
        }
        .indent {
            margin-left: 20px;
        }
        .page-break {
            page-break-before: always;
        }
        @media print {
            body { margin: 0.75in; }
            .page-break { page-break-before: always; }
        }
    </style>
</head>
<body>
    <div class="header">
        Texas Residential Lease Agreement
    </div>

    <div class="section">
        THIS AGREEMENT (hereinafter referred to as the "Texas Lease Agreement") is made and entered into this <span class="form-line">${signatureDate.day}</span> day of <span class="form-line">${signatureDate.month}</span>, <span class="form-line">${signatureDate.year}</span>, by and between <span class="form-line">${data.landlordName}</span> (hereinafter referred to as "Landlord") and <span class="form-line">${tenantList}</span> (hereinafter referred to as "Tenant." For and in consideration of the covenants and obligations contained herein and other good and valuable consideration, the receipt and sufficiency of which is hereby acknowledged, the parties hereto hereby agree as follows:
    </div>

    <div class="section">
        <strong>1. PROPERTY.</strong> Landlord owns certain real property and improvements located at <span class="form-line">${fullAddress}, ${data.city}, ${data.state} ${data.zipCode}</span> (hereinafter referred to as the "Property"). Landlord desires to lease the Premises to Tenant upon the terms and conditions contained herein. Tenant desires to lease the Premises from Landlord on the terms and conditions as contained herein.
    </div>

    <div class="section">
        <strong>2. TERM.</strong> This Texas Lease Agreement shall commence on <span class="form-line">${formatDate(data.leaseStartDate)}</span> and shall continue as a lease for term. The termination date shall be on <span class="form-line">${formatDate(data.leaseEndDate)}</span> at 11:59 PM. Upon termination date, Tenant shall be required to vacate the Premises unless one of the following circumstances occur:<br><br>
        &nbsp;&nbsp;&nbsp;&nbsp;(i) Landlord and Tenant formally extend this Texas Lease Agreement in writing or create and execute a new, written, and signed Texas Lease Agreement; or<br>
        &nbsp;&nbsp;&nbsp;&nbsp;(ii) Landlord willingly accepts new Rent from Tenant, which does not constitute past due Rent.<br><br>
        In the event that Landlord accepts new rent from Tenant after the termination date, a month-to-month tenancy shall be created. If at any time either party desires to terminate the month-to-month tenancy, such party may do so by providing to the other party written notice of intention to terminate at least 30 days prior to the desired date of termination of the month-to-month tenancy. Notices to terminate may be given on any calendar day, irrespective of Commencement Date. Rent shall continue at the rate specified in this Texas Lease Agreement, or as allowed by law. All other terms and conditions as outlined in this Texas Lease Agreement shall remain in full force and effect. Time is of the essence for providing notice of termination (strict compliance with dates by which notice must be provided is required).
    </div>

    <div class="section">
        <strong>3. RENT.</strong> Tenant shall pay to Landlord the sum of <span class="form-line">$${data.rentAmount.toLocaleString()}</span> per month as Rent for the Term of the Agreement. Due date for Rent payment shall be the ${data.paymentDueDate === 1 ? '1st' : data.paymentDueDate + 'th'} day of each calendar month and shall be considered advance payment for that month. Weekends and holidays do not delay or excuse Tenant's obligation to timely pay rent.<br><br>
        
        <div class="indent">
            <strong>A. Delinquent Rent.</strong> If not paid on the ${data.paymentDueDate === 1 ? '1st' : data.paymentDueDate + 'th'}, Rent shall be considered overdue and delinquent on the ${data.paymentDueDate === 1 ? '2nd' : data.paymentDueDate + 1 + 'th'} day of each calendar month. If Tenant fails to timely pay any month's rent, Tenant will pay Landlord a late charge of <span class="form-line">$${lateFeePerDay}</span> per day until rent is paid in full. If Landlord receives the monthly rent by the ${data.paymentDueDate === 1 ? '3rd' : data.paymentDueDate + 2 + 'th'} day of the month, Landlord will waive the late charges for that month. Any waiver of late charges under this paragraph will not affect or diminish any other right or remedy Landlord may exercise for Tenant's failure to timely pay rent.<br><br>
            
            <strong>B. Prorated Rent.</strong> In the event that the Commencement Date is not the 1st of the calendar month, Rent payment remitted on the Commencement Date shall be prorated based on a 30-day period.<br><br>
            
            <strong>C. Returned Checks.</strong> In the event that any payment by Tenant is returned for insufficient funds ("NSF") or if Tenant stops payment, Tenant will pay <span class="form-line">$${nsfFee}</span> to Landlord for each such check, plus late charges, as described above, until Landlord has received payment. Furthermore, Landlord may require in writing that Tenant pay all future Rent payments by cash, money order, or cashier's check.<br><br>
            
            <strong>D. Order in which funds are applied.</strong> Landlord will apply all funds received from Tenant first to any non-rent obligations of Tenant including late charges, returned check charges, charge-backs for repairs, brokerage fees, and periodic utilities, then to rent, regardless of any notations on a check.<br><br>
            
            <strong>E. Rent Increases.</strong> There will be no rent increases through the Termination Date. If this lease is renewed automatically on a month to month basis, Landlord may increase the rent during the renewal period by providing written notice to Tenant that becomes effective the month following the 30th day after the notice is provided.
        </div>
    </div>

    <div class="section">
        <strong>4. SECURITY DEPOSIT.</strong> Upon execution of this Texas Lease Agreement, Tenant shall deposit with Landlord the sum of <span class="form-line">$${data.securityDeposit.toLocaleString()}</span>, receipt of which is hereby acknowledged by Landlord, as security for any damage caused to the Premises during the term hereof.
    </div>

    <div class="section">
        <strong>5. REFUND OF SECURITY DEPOSIT.</strong> Upon termination of the tenancy, all funds held by the landlord as security deposit may be applied to the payment of accrued rent and the amount of damages that the landlord has suffered by reason of the tenant's noncompliance with the terms of this Texas Lease Agreement or with any and all laws, ordinances, rules and orders of any and all governmental or quasi-governmental authorities affecting the cleanliness, use, occupancy and preservation of the Premises.
    </div>

    <div class="section">
        <strong>6. USE OF PREMISES.</strong> The Premises shall be used and occupied solely by Tenant and Tenant's immediate family, consisting of <span class="form-line">${familyMembers || 'Named Tenant(s) only'}</span>, exclusively, as a private single family dwelling, and no part of the Premises shall be used at any time during the term of this Texas Lease Agreement by Tenant for the purpose of carrying on any business, profession, or trade of any kind, or for any purpose other than as a private single family dwelling. Tenant shall not allow any other person, other than Tenant's immediate family or transient relatives and friends who are guests of Tenant, to use or occupy the Premises without first obtaining Landlord's written consent to such use. Tenant shall comply with any and all laws, ordinances, rules and orders of any and all governmental or quasi-governmental authorities affecting the cleanliness, use, occupancy and preservation of the Premises.
    </div>

    <div class="section">
        <strong>7. CONDITION OF PREMISES.</strong> Tenant stipulates, represents and warrants that Tenant has examined the Premises, and that they are at the time of this Lease in good order, repair, and in a safe, clean and tenantable condition.
    </div>

    <div class="section">
        <strong>8. ASSIGNMENT AND SUB-LETTING.</strong> Tenant shall not assign this Texas Lease Agreement, or sub-let or grant any license to use the Premises or any part thereof without the prior written consent of Landlord. A consent by Landlord to one such assignment, sub-letting or license shall not be deemed to be a consent to any subsequent assignment, sub-letting or license. An assignment, sub-letting or license without the prior written consent of Landlord or an assignment or sub-letting by operation of law shall be absolutely null and void and shall, at Landlord's option, terminate this Texas Lease Agreement.
    </div>

    <div class="page-break"></div>

    <div class="section">
        <strong>9. ALTERATIONS AND IMPROVEMENTS.</strong> Tenant shall make no alterations to the buildings or improvements on the Premises or construct any building or make any other improvements on the Premises without the prior written consent of Landlord. Any and all alterations, changes, and/or improvements built, constructed or placed on the Premises by Tenant shall, unless otherwise provided by written agreement between Landlord and Tenant, be and become the property of Landlord and remain on the Premises at the expiration or earlier termination of this Texas Lease Agreement.
    </div>

    <div class="section">
        <strong>10. NON-DELIVERY OF POSSESSION.</strong> In the event Landlord cannot deliver possession of the Premises to Tenant upon the commencement of the Lease term, through no fault of Landlord or its agents, then Landlord or its agents shall have no liability, but the rental herein provided shall abate until possession is given. Landlord or its agents shall have thirty (30) days in which to give possession, and if possession is tendered within such time, Tenant agrees to accept the demised Premises and pay the rental herein provided from that date. In the event possession cannot be delivered within such time, through no fault of Landlord or its agents, then this Texas Lease Agreement and all rights hereunder shall terminate.
    </div>

    <div class="section">
        <strong>11. HAZARDOUS MATERIALS.</strong> Tenant shall not keep on the Premises any item of a dangerous, flammable or explosive character that might unreasonably increase the danger of fire or explosion on the Premises or that might be considered hazardous or extra hazardous by any responsible insurance company.
    </div>

    <div class="section">
        <strong>12. UTILITIES.</strong> Tenant shall be responsible for arranging for and paying for all utility services required on the Premises${data.utilitiesIncluded.length > 0 ? `, except for the following utilities which are included: ${data.utilitiesIncluded.join(', ')}` : ''}.
    </div>

    <div class="section">
        <strong>13. MAINTENANCE, REPAIR, AND RULES.</strong> Tenant will, at its sole expense, keep and maintain the Premises and appurtenances in good and sanitary condition and repair during the term of this Texas Lease Agreement and any renewal thereof. Without limiting the generality of the foregoing, Tenant shall:<br><br>
        
        <div class="indent">
            A. Not obstruct the driveways, sidewalks, courts, entry ways, stairs and/or halls, which shall be used for the purposes of ingress and egress only;<br>
            B. Keep all windows, glass, window coverings, doors, locks and hardware in good, clean order and repair;<br>
            C. Not obstruct or cover the windows or doors;<br>
            D. Not leave windows or doors in an open position during any inclement weather;<br>
            E. Not hang any laundry, clothing, sheets, etc., from any window, rail, porch or balcony nor air or dry any of same within any yard area or space;<br>
            F. Not cause or permit any locks or hooks to be placed upon any door or window without the prior written consent of Landlord;<br>
            G. Keep all air conditioning filters clean and free from dirt;<br>
            H. Keep all lavatories, sinks, toilets, and all other water and plumbing apparatus in good order and repair and shall use same only for the purposes for which they were constructed. Tenant shall not allow any sweepings, rubbish, sand, rags, ashes or other substances to be thrown or deposited therein. Any damage to any such apparatus and the cost of clearing stopped plumbing resulting from misuse shall be borne by Tenant;<br>
            I. Tenant's family and guests shall at all times maintain order in the Premises and at all places on the Premises, and shall not make or permit any loud or improper noises, or otherwise disturb other residents;<br>
            J. Keep all radios, television sets, stereos, phonographs, etc., turned down to a level of sound that does not annoy or interfere with other residents;<br>
            K. Deposit all trash, garbage, rubbish or refuse in the locations provided and shall not allow any trash, garbage, rubbish or refuse to be deposited or permitted to stand on the exterior of any building or within the common elements;<br>
            L. Abide by and be bound by any and all rules and regulations affecting the Premises or the common area appurtenant thereto which may be adopted or promulgated by the Condominium or Homeowners' Association having control over them.
        </div>
    </div>

    <div class="section">
        <strong>14. DAMAGE TO PREMISES.</strong> In the event the Premises are destroyed or rendered wholly uninhabitable by fire, storm, earthquake, or other casualty not caused by the negligence of Tenant, this Texas Lease Agreement shall terminate from such time except for the purpose of enforcing rights that may have then accrued hereunder. The rental provided for herein shall then be accounted for by and between Landlord and Tenant up to the time of such injury or destruction of the Premises, Tenant paying rentals up to such date and Landlord refunding rentals collected beyond such date. Should a portion of the Premises thereby be rendered uninhabitable, the Landlord shall have the option of either repairing such injured or damaged portion or terminating this Lease. In the event that Landlord exercises its right to repair such uninhabitable portion, the rental shall abate in the proportion that the injured parts bears to the whole Premises, and such part so injured shall be restored by Landlord as speedily as practicable, after which the full rent shall recommence and the Texas Lease Agreement continue according to its terms.
    </div>

    <div class="section">
        <strong>15. ACCESS BY LANDLORD.</strong> Landlord and Landlord's agents shall have the right at all reasonable times, and by all reasonable means, without notice, during the term of this Texas Lease Agreement and any renewal thereof to enter the Premises for the following purposes:<br><br>
        
        <div class="indent">
            A. Inspect the Property for condition;<br>
            B. Make repairs;<br>
            C. Show the Property to prospective tenants, prospective purchasers, inspectors, fire marshals, lenders, appraisers, or insurance agents;<br>
            D. Exercise a contractual or statutory lien;<br>
            E. Leave written notice;<br>
            F. Seize nonexempt property after default.<br><br>
        </div>
        
        Landlord may prominently display a "For Sale" or "For Lease" or similarly worded sign on the Property during the term of this Lease or any renewal period. If Tenant fails to permit reasonable access under this Paragraph, Tenant will be in default.
    </div>

    <div class="section">
        <strong>16. SUBORDINATION OF LEASE.</strong> This Texas Lease Agreement and Tenant's interest hereunder are and shall be subordinate, junior and inferior to any and all mortgages, liens or encumbrances now or hereafter placed on the Premises by Landlord, all advances made under any such mortgages, liens or encumbrances (including, but not limited to, future advances), the interest payable on such mortgages, liens or encumbrances and any and all renewals, extensions or modifications of such mortgages, liens or encumbrances.
    </div>

    <div class="section">
        <strong>17. TENANT'S HOLD OVER.</strong> If Tenant remains in possession of the Premises with the consent of Landlord after the natural expiration of this Texas Lease Agreement, a new tenancy from month-to-month shall be created between Landlord and Tenant which shall be subject to all of the terms and conditions hereof except that rent shall then be due and owing at <span class="form-line">$${holdOverRent.toLocaleString()}</span> per month and except that such tenancy shall be terminable upon fifteen (15) days written notice served by either party.
    </div>

    <div class="section">
        <strong>18. SURRENDER OF PREMISES.</strong> Upon the expiration of the term hereof, Tenant shall surrender the Premises in as good a state and condition as they were at the commencement of this Texas Lease Agreement, reasonable use and wear and tear thereof and damages by the elements excepted.
    </div>

    <div class="section">
        <strong>19. ANIMALS.</strong> THERE WILL BE NO ANIMALS, unless authorized by a separate written Pet Addendum to this Residential Lease Agreement. Tenant shall not permit any animal, including mammals, reptiles, birds, fish, rodents, or insects on the property, even temporarily, unless otherwise agreed by a separate written Pet Agreement. If tenant violates the pet restrictions of this Lease, Tenant will pay to Landlord a fee of <span class="form-line">$${petFeePerDay}</span> per day per animal for each day Tenant violates the animal restrictions as additional rent for any unauthorized animal. Landlord may remove or cause to be removed any unauthorized animal and deliver it to appropriate local authorities by providing at least 24-hour written notice to Tenant of Landlord's intention to remove the unauthorized animal. Landlord will not be liable for any harm, injury, death, or sickness to any unauthorized animal. Tenant is responsible and liable for any damage or required cleaning to the Property caused by any unauthorized animal and for all costs Landlord may incur in removing or causing any unauthorized animal to be removed.
    </div>

    <div class="section">
        <strong>20. WATERBEDS.</strong> THERE WILL BE NO WATERBEDS, unless authorized by a separate written Waterbed Addendum to this Residential Lease Agreement.
    </div>

    <div class="section">
        <strong>21. QUIET ENJOYMENT.</strong> Tenant, upon payment of all of the sums referred to herein as being payable by Tenant and Tenant's performance of all Tenant's agreements contained herein and Tenant's observance of all rules and regulations, shall and may peacefully and quietly have, hold and enjoy said Premises for the term hereof.
    </div>

    <div class="section">
        <strong>22. INDEMNIFICATION.</strong> Landlord shall not be liable for any damage or injury of or to the Tenant, Tenant's family, guests, invitees, agents or employees or to any person entering the Premises or the building of which the Premises are a part or to goods or equipment, or in the structure or equipment of the structure of which the Premises are a part, and Tenant hereby agrees to indemnify, defend and hold Landlord harmless from any and all claims or assertions of every kind and nature.
    </div>

    <div class="section">
        <strong>23. DEFAULT.</strong> If Landlord breaches this Lease, Tenant may seek any relief provided by law. If Tenant fails to comply with any of the material provisions of this Texas Lease Agreement, other than the covenant to pay rent, or of any present rules and regulations or any that may be hereafter prescribed by Landlord, or materially fails to comply with any duties imposed on Tenant by statute, within seven (7) days after delivery of written notice by Landlord specifying the non-compliance and indicating the intention of Landlord to terminate the Lease by reason thereof, Landlord may terminate this Texas Lease Agreement. If Tenant fails to pay rent when due and the default continues for seven (7) days thereafter, Landlord may, at Landlord's option, declare the entire balance of rent payable hereunder to be immediately due and payable and may exercise any and all rights and remedies available to Landlord at law or in equity or may immediately terminate this Texas Lease Agreement.
    </div>

    <div class="page-break"></div>

    <div class="section">
        <strong>24. ABANDONMENT.</strong> If at any time during the term of this Texas Lease Agreement Tenant abandons the Premises or any part thereof, Landlord may, at Landlord's option, obtain possession of the Premises in the manner provided by law, and without becoming liable to Tenant for damages or for any payment of any kind whatever. Landlord may, at Landlord's discretion, as agent for Tenant, relet the Premises, or any part thereof, for the whole or any part thereof, for the whole or any part of the then unexpired term, and may receive and collect all rent payable by virtue of such reletting, and, at Landlord's option, hold Tenant liable for any difference between the rent that would have been payable under this Texas Lease Agreement during the balance of the unexpired term, if this Texas Lease Agreement had continued in force, and the net rent for such period realized by Landlord by means of such reletting. If Landlord's right of reentry is exercised following abandonment of the Premises by Tenant, then Landlord shall consider any personal property belonging to Tenant and left on the Premises to also have been abandoned, in which case Landlord may dispose of all such personal property in any manner Landlord shall deem proper and Landlord is hereby relieved of all liability for doing so.
    </div>

    <div class="section">
        <strong>25. ATTORNEYS' FEES.</strong> Should it become necessary for Landlord to employ an attorney to enforce any of the conditions or covenants hereof, including the collection of rentals or gaining possession of the Premises, Tenant agrees to pay all expenses so incurred, including a reasonable attorneys' fee.
    </div>

    <div class="section">
        <strong>26. RECORDING OF TEXAS LEASE AGREEMENT.</strong> Tenant shall not record this Texas Lease Agreement on the Public Records of any public office. In the event that Tenant shall record this Texas Lease Agreement, this Texas Lease Agreement shall, at Landlord's option, terminate immediately and Landlord shall be entitled to all rights and remedies that it has at law or in equity.
    </div>

    <div class="section">
        <strong>27. GOVERNING LAW.</strong> This Texas Lease Agreement shall be governed, construed and interpreted by, through and under the Laws of the State of Texas.
    </div>

    <div class="section">
        <strong>28. SEVERABILITY.</strong> If any provision of this Texas Lease Agreement or the application thereof shall, for any reason and to any extent, be invalid or unenforceable, neither the remainder of this Texas Lease Agreement nor the application of the provision to other persons, entities or circumstances shall be affected thereby, but instead shall be enforced to the maximum extent permitted by law.
    </div>

    <div class="section">
        <strong>29. BINDING EFFECT.</strong> The covenants, obligations and conditions herein contained shall be binding on and inure to the benefit of the heirs, legal representatives, and assigns of the parties hereto.
    </div>

    <div class="section">
        <strong>30. DESCRIPTIVE HEADINGS.</strong> The descriptive headings used herein are for convenience of reference only and they are not intended to have any effect whatsoever in determining the rights or obligations of the Landlord or Tenant.
    </div>

    <div class="section">
        <strong>31. CONSTRUCTION.</strong> The pronouns used herein shall include, where appropriate, either gender or both, singular and plural.
    </div>

    <div class="section">
        <strong>32. NON-WAIVER.</strong> No delay, indulgence, waiver, non-enforcement, election or non-election by Landlord under this Texas Lease Agreement will be deemed to be a waiver of any other breach by Tenant, nor shall it affect Tenant's duties, obligations, and liabilities hereunder.
    </div>

    <div class="section">
        <strong>33. MODIFICATION.</strong> The parties hereby agree that this document contains the entire agreement between the parties and this Texas Lease Agreement shall not be modified, changed, altered or amended in any way except through a written amendment signed by all of the parties hereto.
    </div>

    <div class="section">
        <strong>34. NOTICE.</strong> Any notice required or permitted under this Lease or under state law shall be delivered to Tenant at the Property address, and to Landlord at the following address:<br>
        <span class="form-line">${data.landlordAddress}</span>
    </div>

    <div class="section">
        <strong>35. LEAD-BASED PAINT DISCLOSURE.</strong> If the premises were constructed prior to 1978, Tenant acknowledges receipt of the form entitled "LEAD-BASED PAINT DISCLOSURE" which contains disclosure of information on lead-based paint and/or lead-based paint hazards.
    </div>

    ${
		data.additionalTerms
			? `
    <div class="section">
        <strong>ADDITIONAL TERMS:</strong><br>
        ${data.additionalTerms}
    </div>
    `
			: ''
	}

    <div style="margin-top: 40px;">
        <div class="section">
            As to Landlord this <span class="form-line">${signatureDate.day}</span> day of <span class="form-line">${signatureDate.month}</span>, <span class="form-line">${signatureDate.year}</span>.<br><br>
            
            <strong>LANDLORD:</strong><br><br>
            Sign: <span class="signature-line"></span><br>
            Print: <span class="form-line">${data.landlordName}</span> Date: <span class="date-line"></span>
        </div>

        <div class="section" style="margin-top: 30px;">
            As to Tenant, this <span class="form-line">${signatureDate.day}</span> day of <span class="form-line">${signatureDate.month}</span>, <span class="form-line">${signatureDate.year}</span>.<br><br>
            
            ${data.tenantNames
				.map(
					(name, index) => `
            <strong>TENANT${data.tenantNames.length > 1 ? ` ${index + 1}` : ''}:</strong><br><br>
            Sign: <span class="signature-line"></span><br>
            Print: <span class="form-line">${name}</span> Date: <span class="date-line"></span><br><br>
            `
				)
				.join('')}
        </div>
    </div>

    <div style="margin-top: 40px; padding: 15px; border: 1px solid #000; font-size: 10px;">
        <strong>NOTICE:</strong> This lease agreement was generated using TenantFlow's lease generator tool. Please review all terms carefully and consider having this agreement reviewed by a qualified attorney before signing. Laws vary by state and locality. This software is not a substitute for legal advice.
    </div>

</body>
</html>
  `
}

export function generateTexasLeaseText(data: TexasLeaseData): string {
	const formatDate = (dateStr: string) => {
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	}

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(amount)
	}

	const fullAddress = `${data.propertyAddress}${data.unitNumber ? `, ${data.unitNumber}` : ''}, ${data.city}, ${data.state} ${data.zipCode}`
	const tenantList = data.tenantNames.join(', ')
	const currentDate = new Date().toLocaleDateString('en-US')

	return `
RESIDENTIAL LEASE AGREEMENT
STATE OF TEXAS

This lease agreement is entered into on ${currentDate} between ${data.landlordName} (Landlord) and ${tenantList} (Tenant(s)).

1. PROPERTY
Property located at: ${fullAddress}
County of ${data.countyName || data.city}, Texas ${data.zipCode}
${data.parkingSpaces ? `Including ${data.parkingSpaces} parking space(s).` : ''}
${data.storageUnit ? `Including storage unit: ${data.storageUnit}` : ''}

2. TERM
Lease begins: ${formatDate(data.leaseStartDate)}
Lease ends: ${formatDate(data.leaseEndDate)}
${data.moveInDate && data.moveInDate !== data.leaseStartDate ? `Move-in date: ${formatDate(data.moveInDate)}` : ''}

3. RENT AND PAYMENT
Monthly rent: ${formatCurrency(data.rentAmount)}
Due date: ${data.paymentDueDate}${data.paymentDueDate === 1 ? 'st' : data.paymentDueDate === 2 ? 'nd' : data.paymentDueDate === 3 ? 'rd' : 'th'} of each month
Payment method: ${data.paymentMethod.replace('_', ' ')}
${data.paymentAddress ? `Payment address: ${data.paymentAddress}` : ''}
Late fee: ${formatCurrency(data.lateFeeAmount)} after ${data.lateFeeDays} days
${data.prorationAmount ? `Prorated first month: ${formatCurrency(data.prorationAmount)}` : ''}

4. SECURITY DEPOSIT
Security deposit: ${formatCurrency(data.securityDeposit)}
${data.keyDeposit ? `Key deposit: ${formatCurrency(data.keyDeposit)}` : ''}

5. OCCUPANCY
Maximum occupants: ${data.occupancyLimits?.maxOccupants || 'Tenant(s) and minor children'}
${data.emergencyContact ? `Emergency contact: ${data.emergencyContact.name} (${data.emergencyContact.phone}) - ${data.emergencyContact.relationship}` : ''}

6. PETS
Pet policy: ${data.petPolicy === 'not_allowed' ? 'No pets allowed' : data.petPolicy === 'allowed' ? 'Pets allowed' : `Pets allowed with deposit of ${formatCurrency(data.petDeposit || 0)}`}
${data.petDetails ? `Pet details: ${data.petDetails.type}, ${data.petDetails.breed}, ${data.petDetails.weight}, Registration: ${data.petDetails.registration}` : ''}

7. SMOKING
Smoking policy: ${data.smokingPolicy === 'not_allowed' ? 'No smoking allowed' : 'Smoking permitted'}

8. UTILITIES
Included utilities: ${data.utilitiesIncluded.length > 0 ? data.utilitiesIncluded.join(', ') : 'None'}

9. MAINTENANCE
Responsibility: ${data.maintenanceResponsibility === 'landlord' ? 'Landlord responsible for all maintenance' : data.maintenanceResponsibility === 'tenant' ? 'Tenant responsible for maintenance under $100' : 'Shared responsibility'}

10. ADDITIONAL TERMS
${data.additionalTerms || 'None specified.'}

11. LANDLORD INFORMATION
Name: ${data.landlordName}
Address: ${data.landlordAddress}
Email: ${data.landlordEmail}
${data.landlordPhone ? `Phone: ${data.landlordPhone}` : ''}

SIGNATURES
Landlord: _________________________ Date: _____________
${data.landlordName}

${data.tenantNames
	.map(
		name => `
Tenant: _________________________ Date: _____________
${name}
`
	)
	.join('')}

NOTICE: This lease agreement was generated using TenantFlow's lease generator tool.
Please review with a qualified attorney before signing.
  `
}
