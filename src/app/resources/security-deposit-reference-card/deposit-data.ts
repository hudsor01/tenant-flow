export interface StateDeposit {
	state: string;
	abbr: string;
	maxDeposit: string;
	returnDeadline: string;
	itemizedRequired: boolean;
	/** True when the statute requires interest in any case; notes give the conditions. */
	interestRequired: boolean;
	notes: string;
	/** The statute the row was checked against. */
	citation: string;
	/** The statute text, when a stable page for that section exists. */
	citationUrl?: string;
}

/**
 * Every row was checked against its state's statute on 2026-11-25 (2026-11-24
 * audit D1-D3): the cap, the return deadline, the itemization and interest
 * rules. Re-check each row every year, and whenever a state amends its
 * deposit law.
 */
export const stateData: StateDeposit[] = [
	{
		state: "Alabama",
		abbr: "AL",
		maxDeposit: "1 month",
		returnDeadline: "60 days",
		itemizedRequired: true,
		interestRequired: false,
		notes:
			"Extra deposit allowed for pets, alterations or added liability risk. Unclaimed deposit forfeited after 90 days",
		citation: "Ala. Code § 35-9A-201",
		citationUrl:
			"https://codes.findlaw.com/al/title-35-property/al-code-sect-35-9a-201/",
	},
	{
		state: "Alaska",
		abbr: "AK",
		maxDeposit: "2 months",
		returnDeadline: "14 days (30 if no notice or deductions)",
		itemizedRequired: true,
		interestRequired: false,
		notes:
			"Cap does not apply if rent exceeds $2,000/month. Separate pet deposit up to 1 month allowed",
		citation: "Alaska Stat. § 34.03.070",
		citationUrl:
			"https://codes.findlaw.com/ak/title-34-property/ak-st-sect-34-03-070/",
	},
	{
		state: "Arizona",
		abbr: "AZ",
		maxDeposit: "1.5 months",
		returnDeadline: "14 business days",
		itemizedRequired: true,
		interestRequired: false,
		notes:
			"14 days excludes weekends and holidays; runs from move-out and tenant demand",
		citation: "A.R.S. § 33-1321",
		citationUrl: "https://www.azleg.gov/ars/33/01321.htm",
	},
	{
		state: "Arkansas",
		abbr: "AR",
		maxDeposit: "2 months",
		returnDeadline: "60 days",
		itemizedRequired: true,
		interestRequired: false,
		notes:
			"Exempt: owners of 5 or fewer units unless managed by a third party for a fee",
		citation: "Ark. Code §§ 18-16-303, 18-16-304, 18-16-305",
		citationUrl:
			"https://codes.findlaw.com/ar/title-18-property/ar-code-sect-18-16-305/",
	},
	{
		state: "California",
		abbr: "CA",
		maxDeposit: "1 month (2 for small landlords)",
		returnDeadline: "21 days",
		itemizedRequired: true,
		interestRequired: false,
		notes:
			"AB 12, since 7/1/2024. Small landlord: natural person/LLC, max 2 properties, 4 units; not for servicemembers",
		citation: "Cal. Civ. Code § 1950.5",
		citationUrl:
			"https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1950.5",
	},
	{
		state: "Colorado",
		abbr: "CO",
		maxDeposit: "2 months",
		returnDeadline: "30 days (up to 60 if lease says)",
		itemizedRequired: true,
		interestRequired: false,
		notes:
			"HB 25-1249 (eff. 1/1/2026) dropped its 1-month cap; 2-month cap stays (SB 23-184). One month became 30 days",
		citation: "C.R.S. §§ 38-12-102.5, 38-12-103",
	},
	{
		state: "Connecticut",
		abbr: "CT",
		maxDeposit: "2 months (1 if tenant 62+)",
		returnDeadline: "21 days, or 15 after address if later",
		itemizedRequired: true,
		interestRequired: true,
		notes:
			"Interest at CT deposit index, paid yearly. P.A. 23-207 cut the return deadline from 30 to 21 days",
		citation: "Conn. Gen. Stat. § 47a-21",
		citationUrl: "https://www.cga.ct.gov/2026/sup/chap_831.htm",
	},
	{
		state: "Delaware",
		abbr: "DE",
		maxDeposit: "1 month (1-yr+ leases)",
		returnDeadline: "20 days",
		itemizedRequired: true,
		interestRequired: false,
		notes:
			"Month-to-month: 1-month cap applies after 1 year. Furnished units exempt. Pet deposit up to 1 month extra",
		citation: "25 Del. C. § 5514",
		citationUrl: "https://delcode.delaware.gov/title25/c055/index.html",
	},
	{
		state: "DC",
		abbr: "DC",
		maxDeposit: "1 month",
		returnDeadline: "45 days (+30 if withholding)",
		itemizedRequired: true,
		interestRequired: true,
		notes:
			"Held in interest-bearing escrow; interest at passbook rate. Damage claims need photos or other documentation",
		citation: "14 DCMR §§ 308-311; D.C. Code § 42-3502.17",
		citationUrl:
			"https://code.dccouncil.gov/us/dc/council/code/sections/42-3502.17",
	},
	{
		state: "Florida",
		abbr: "FL",
		maxDeposit: "No limit",
		returnDeadline: "15 days (30 to send claim notice)",
		itemizedRequired: true,
		interestRequired: false,
		notes:
			"Claim notice by certified mail; tenant has 15 days to object. Interest only if in interest-bearing account",
		citation: "Fla. Stat. § 83.49",
		citationUrl: "https://www.flsenate.gov/Laws/Statutes/2025/83.49",
	},
	{
		state: "Georgia",
		abbr: "GA",
		maxDeposit: "2 months",
		returnDeadline: "30 days",
		itemizedRequired: true,
		interestRequired: false,
		notes:
			"2-month cap applies to leases signed or renewed on or after 7/1/2024 (Safe at Home Act, HB 404)",
		citation: "O.C.G.A. §§ 44-7-30.1, 44-7-34",
		citationUrl:
			"https://codes.findlaw.com/ga/title-44-property/ga-code-sect-44-7-34/",
	},
	{
		state: "Hawaii",
		abbr: "HI",
		maxDeposit: "1 month",
		returnDeadline: "14 days",
		itemizedRequired: true,
		interestRequired: false,
		notes:
			"Separate pet deposit up to 1 month allowed (not for assistance animals)",
		citation: "Haw. Rev. Stat. § 521-44",
		citationUrl:
			"https://codes.findlaw.com/hi/division-3-property-family/hi-rev-st-sect-521-44/",
	},
	{
		state: "Idaho",
		abbr: "ID",
		maxDeposit: "No limit",
		returnDeadline: "21 days (up to 30 if lease agrees)",
		itemizedRequired: true,
		interestRequired: false,
		notes: "",
		citation: "Idaho Code § 6-321",
		citationUrl:
			"https://legislature.idaho.gov/statutesrules/idstat/title6/t6ch3/sect6-321/",
	},
	{
		state: "Illinois",
		abbr: "IL",
		maxDeposit: "No limit",
		returnDeadline: "30 days to itemize, 45 to return",
		itemizedRequired: true,
		interestRequired: true,
		notes:
			"Return Act covers 5+ unit properties. Interest only for 25+ units, deposit held 6+ months. Chicago differs",
		citation: "765 ILCS 710/1; 765 ILCS 715/1",
		citationUrl:
			"https://codes.findlaw.com/il/chapter-765-property/il-st-sect-765-710-1/",
	},
	{
		state: "Indiana",
		abbr: "IN",
		maxDeposit: "No limit",
		returnDeadline: "45 days",
		itemizedRequired: true,
		interestRequired: false,
		notes: "Clock starts once tenant gives a written forwarding address",
		citation: "Ind. Code § 32-31-3-12",
		citationUrl:
			"https://codes.findlaw.com/in/title-32-property/in-code-sect-32-31-3-12/",
	},
	{
		state: "Iowa",
		abbr: "IA",
		maxDeposit: "2 months",
		returnDeadline: "30 days",
		itemizedRequired: true,
		interestRequired: false,
		notes:
			"30 days runs from move-out plus tenant's address. Interest in first 5 years belongs to landlord",
		citation: "Iowa Code § 562A.12",
		citationUrl: "https://www.legis.iowa.gov/docs/code/562A.12.pdf",
	},
	{
		state: "Kansas",
		abbr: "KS",
		maxDeposit: "1 month (unfurn) / 1.5 (furn)",
		returnDeadline: "30 days",
		itemizedRequired: true,
		interestRequired: false,
		notes:
			"Pet deposit up to 1/2 month extra. Balance due 14 days after deductions are set, max 30 days",
		citation: "K.S.A. § 58-2550",
		citationUrl:
			"https://www.ksrevisor.gov/statutes/chapters/ch58/058_025_0050.html",
	},
	{
		state: "Kentucky",
		abbr: "KY",
		maxDeposit: "No limit",
		returnDeadline: "No fixed deadline in statute",
		itemizedRequired: true,
		interestRequired: false,
		notes:
			"Applies only where local URLTA adopted; separate account; signed move-in/out damage lists required",
		citation: "KRS 383.580; KRS 383.500",
		citationUrl:
			"https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=35733",
	},
	{
		state: "Louisiana",
		abbr: "LA",
		maxDeposit: "No limit",
		returnDeadline: "1 month (itemized list: +15 days)",
		itemizedRequired: true,
		interestRequired: false,
		notes:
			"Act 63 of 2026 (eff. Aug 1, 2026) added 15 days for the itemized statement; tenant gives forwarding address",
		citation: "La. R.S. 9:3251",
		citationUrl: "https://www.legis.la.gov/legis/Law.aspx?d=107468",
	},
	{
		state: "Maine",
		abbr: "ME",
		maxDeposit: "2 months",
		returnDeadline: "30 days (lease), 21 days (at will)",
		itemizedRequired: true,
		interestRequired: false,
		notes:
			"Must be held in a bank account beyond the reach of the landlord's creditors",
		citation: "14 M.R.S. §§ 6032, 6033, 6038",
		citationUrl:
			"https://legislature.maine.gov/statutes/14/title14sec6033.html",
	},
	{
		state: "Maryland",
		abbr: "MD",
		maxDeposit: "1 month",
		returnDeadline: "45 days",
		itemizedRequired: true,
		interestRequired: true,
		notes:
			"Cap cut from 2 months on Oct 1, 2024; interest on deposits of $50+ (1-yr Treasury rate or 1.5%)",
		citation: "Md. Code, Real Prop. § 8-203",
		citationUrl:
			"https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=grp&section=8-203&enactments=false",
	},
	{
		state: "Massachusetts",
		abbr: "MA",
		maxDeposit: "1 month",
		returnDeadline: "30 days",
		itemizedRequired: true,
		interestRequired: true,
		notes:
			"5% annual interest or the bank's actual rate; itemized damage list must be sworn under penalty of perjury",
		citation: "M.G.L. c. 186, § 15B",
		citationUrl:
			"https://malegislature.gov/Laws/GeneralLaws/PartII/TitleI/Chapter186/Section15B",
	},
	{
		state: "Michigan",
		abbr: "MI",
		maxDeposit: "1.5 months",
		returnDeadline: "30 days",
		itemizedRequired: true,
		interestRequired: false,
		notes: "Detailed move-in checklist required",
		citation: "MCL 554.602, 554.608, 554.609, 554.613",
		citationUrl:
			"https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-554-602",
	},
	{
		state: "Minnesota",
		abbr: "MN",
		maxDeposit: "No limit",
		returnDeadline: "21 days (5 if building condemned)",
		itemizedRequired: true,
		interestRequired: true,
		notes:
			"1% simple interest; 21-day clock starts once landlord has the tenant's mailing address",
		citation: "Minn. Stat. § 504B.178",
		citationUrl: "https://www.revisor.mn.gov/statutes/cite/504B.178",
	},
	{
		state: "Mississippi",
		abbr: "MS",
		maxDeposit: "No limit",
		returnDeadline: "45 days",
		itemizedRequired: true,
		interestRequired: false,
		notes:
			"45 days runs from termination, delivery of possession and tenant's demand",
		citation: "Miss. Code Ann. § 89-8-21",
		citationUrl:
			"https://law.justia.com/codes/mississippi/title-89/chapter-8/section-89-8-21/",
	},
	{
		state: "Missouri",
		abbr: "MO",
		maxDeposit: "2 months",
		returnDeadline: "30 days",
		itemizedRequired: true,
		interestRequired: false,
		notes: "",
		citation: "RSMo § 535.300",
		citationUrl: "https://revisor.mo.gov/main/OneSection.aspx?section=535.300",
	},
	{
		state: "Montana",
		abbr: "MT",
		maxDeposit: "No limit",
		returnDeadline: "30 days (10 if no deductions)",
		itemizedRequired: true,
		interestRequired: false,
		notes: "",
		citation: "MCA § 70-25-202",
		citationUrl:
			"https://mca.legmt.gov/bills/mca/title_0700/chapter_0250/part_0020/section_0020/0700-0250-0020-0020.html",
	},
	{
		state: "Nebraska",
		abbr: "NE",
		maxDeposit: "1 month (no pets) / 1.25 (pets)",
		returnDeadline: "14 days",
		itemizedRequired: true,
		interestRequired: false,
		notes: "",
		citation: "Neb. Rev. Stat. § 76-1416",
		citationUrl:
			"https://nebraskalegislature.gov/laws/statutes.php?statute=76-1416",
	},
	{
		state: "Nevada",
		abbr: "NV",
		maxDeposit: "3 months",
		returnDeadline: "30 days",
		itemizedRequired: true,
		interestRequired: false,
		notes: "Cap includes any surety bond and last month's rent",
		citation: "NRS 118A.242",
		citationUrl: "https://www.leg.state.nv.us/NRS/NRS-118A.html#NRS118ASec242",
	},
	{
		state: "New Hampshire",
		abbr: "NH",
		maxDeposit: "1 month or $100",
		returnDeadline: "30 days",
		itemizedRequired: true,
		interestRequired: true,
		notes:
			"Whichever is greater; interest due if held 1+ year (bank savings rate)",
		citation: "RSA 540-A:6, 540-A:7",
		citationUrl: "https://gc.nh.gov/rsa/html/LV/540-A/540-A-6.htm",
	},
	{
		state: "New Jersey",
		abbr: "NJ",
		maxDeposit: "1.5 months",
		returnDeadline: "30 days",
		itemizedRequired: true,
		interestRequired: true,
		notes:
			"Interest-bearing NJ account, interest paid yearly; 5 business days if displaced by fire, flood, condemnation",
		citation: "N.J.S.A. 46:8-19, 46:8-21.1, 46:8-21.2",
		citationUrl:
			"https://law.justia.com/codes/new-jersey/title-46/section-46-8-21-1/",
	},
	{
		state: "New Mexico",
		abbr: "NM",
		maxDeposit: "1 month (< 1yr lease)",
		returnDeadline: "30 days",
		itemizedRequired: true,
		interestRequired: true,
		notes:
			"Lease of 1 yr+: no cap, but a deposit over 1 month earns annual passbook-rate interest",
		citation: "NMSA 1978, § 47-8-18",
		citationUrl:
			"https://law.justia.com/codes/new-mexico/chapter-47/article-8/section-47-8-18/",
	},
	{
		state: "New York",
		abbr: "NY",
		maxDeposit: "1 month",
		returnDeadline: "14 days",
		itemizedRequired: true,
		interestRequired: true,
		notes:
			"HSTPA 2019; held in trust, no commingling; interest-bearing account and interest only for 6+ unit buildings",
		citation: "N.Y. Gen. Oblig. Law §§ 7-103, 7-108",
		citationUrl: "https://www.nysenate.gov/legislation/laws/GOB/7-108",
	},
	{
		state: "North Carolina",
		abbr: "NC",
		maxDeposit: "2 wks (weekly) / 1.5 mo (m-to-m) / 2 mo",
		returnDeadline: "30 days (60 w/ interim accounting)",
		itemizedRequired: true,
		interestRequired: false,
		notes: "Must hold in NC trust account or post a bond",
		citation: "N.C. Gen. Stat. §§ 42-50, 42-51, 42-52",
		citationUrl:
			"https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_42/GS_42-51.html",
	},
	{
		state: "North Dakota",
		abbr: "ND",
		maxDeposit: "1 month (2 for felony/eviction judgment)",
		returnDeadline: "30 days",
		itemizedRequired: true,
		interestRequired: true,
		notes:
			"Pet deposit up to $2,500 or 2 months' rent, whichever is greater. No interest if occupancy under 9 months",
		citation: "N.D.C.C. § 47-16-07.1",
		citationUrl: "https://ndlegis.gov/cencode/t47c16.pdf",
	},
	{
		state: "Ohio",
		abbr: "OH",
		maxDeposit: "No limit",
		returnDeadline: "30 days",
		itemizedRequired: true,
		interestRequired: true,
		notes:
			"5%/yr interest on the amount above $50 or 1 month's rent (whichever is greater) if tenant stays 6+ months",
		citation: "Ohio Rev. Code § 5321.16",
		citationUrl: "https://codes.ohio.gov/ohio-revised-code/section-5321.16",
	},
	{
		state: "Oklahoma",
		abbr: "OK",
		maxDeposit: "No limit",
		returnDeadline: "45 days after written demand",
		itemizedRequired: true,
		interestRequired: false,
		notes:
			"Held in an Oklahoma escrow account. Reverts to landlord if tenant makes no written demand within 6 months",
		citation: "41 O.S. § 115",
		citationUrl: "https://oksenate.gov/sites/default/files/2019-12/os41.pdf",
	},
	{
		state: "Oregon",
		abbr: "OR",
		maxDeposit: "No limit",
		returnDeadline: "31 days",
		itemizedRequired: true,
		interestRequired: false,
		notes:
			"No new or increased deposit in the first year (pet exception). No pet deposit for assistance animals",
		citation: "ORS 90.300",
		citationUrl: "https://www.oregonlegislature.gov/bills_laws/ors/ors090.html",
	},
	{
		state: "Pennsylvania",
		abbr: "PA",
		maxDeposit: "2 months (1 month after 1st year)",
		returnDeadline: "30 days",
		itemizedRequired: true,
		interestRequired: true,
		notes:
			"Deposits over $100 held 2+ years go in an interest-bearing escrow; interest paid yearly, less a 1% fee",
		citation: "68 P.S. §§ 250.511a, 250.511b, 250.512",
		citationUrl:
			"https://www.palegis.us/statutes/unconsolidated/law-information/view-statute?SESSYR=1951&SESSIND=0&ACTNUM=20&CHPT=5",
	},
	{
		state: "Rhode Island",
		abbr: "RI",
		maxDeposit: "1 month",
		returnDeadline: "20 days",
		itemizedRequired: true,
		interestRequired: false,
		notes:
			"Extra furniture deposit up to 1 month if furnishings worth $5,000+. Clock can start at forwarding address",
		citation: "R.I. Gen. Laws § 34-18-19",
		citationUrl:
			"https://webserver.rilegislature.gov/Statutes/TITLE34/34-18/34-18-19.htm",
	},
	{
		state: "South Carolina",
		abbr: "SC",
		maxDeposit: "No limit",
		returnDeadline: "30 days",
		itemizedRequired: true,
		interestRequired: false,
		notes:
			"30 days runs from the later of termination and delivery of possession or the tenant's demand",
		citation: "S.C. Code § 27-40-410",
		citationUrl: "https://www.scstatehouse.gov/code/t27c040.php",
	},
	{
		state: "South Dakota",
		abbr: "SD",
		maxDeposit: "1 month (more by agreement if needed)",
		returnDeadline: "21 days",
		itemizedRequired: true,
		interestRequired: false,
		notes:
			"Was 2 weeks before SL 2026 ch 179. Itemized accounting within 45 days if the tenant asks",
		citation: "SDCL §§ 43-32-6.1, 43-32-24",
		citationUrl: "https://sdlegislature.gov/Statutes/43-32-24",
	},
	{
		state: "Tennessee",
		abbr: "TN",
		maxDeposit: "No limit",
		returnDeadline: "No fixed deadline",
		itemizedRequired: true,
		interestRequired: false,
		notes:
			"Applies in counties over 75,000 (2010 census). Damage found within 30 days of move-out. Separate account",
		citation: "Tenn. Code §§ 66-28-102, 66-28-301",
		citationUrl:
			"https://law.justia.com/codes/tennessee/title-66/chapter-28/part-3/section-66-28-301/",
	},
	{
		state: "Texas",
		abbr: "TX",
		maxDeposit: "No limit",
		returnDeadline: "30 days",
		itemizedRequired: true,
		interestRequired: false,
		notes:
			"No refund duty until tenant gives a written forwarding address. No list needed if undisputed rent is owed",
		citation: "Tex. Prop. Code §§ 92.103, 92.104, 92.107",
		citationUrl: "https://statutes.capitol.texas.gov/Docs/PR/htm/PR.92.htm",
	},
	{
		state: "Utah",
		abbr: "UT",
		maxDeposit: "No limit",
		returnDeadline: "30 days",
		itemizedRequired: true,
		interestRequired: false,
		notes:
			"Tenant may serve a 5-business-day demand notice; noncompliance forfeits the deposit plus a $100 penalty",
		citation: "Utah Code § 57-17-3",
		citationUrl: "https://le.utah.gov/xcode/Title57/Chapter17/57-17-S3.html",
	},
	{
		state: "Vermont",
		abbr: "VT",
		maxDeposit: "No limit",
		returnDeadline: "14 days",
		itemizedRequired: true,
		interestRequired: false,
		notes:
			"60 days for seasonal rentals. Willful withholding means double damages. 2026 bill H.772 failed",
		citation: "9 V.S.A. § 4461",
		citationUrl:
			"https://legislature.vermont.gov/statutes/section/09/137/04461",
	},
	{
		state: "Virginia",
		abbr: "VA",
		maxDeposit: "2 months",
		returnDeadline: "45 days",
		itemizedRequired: true,
		interestRequired: false,
		notes: "Deductions itemized in a written notice given with any refund",
		citation: "Va. Code § 55.1-1226",
		citationUrl:
			"https://law.lis.virginia.gov/vacode/title55.1/chapter12/section55.1-1226/",
	},
	{
		state: "Washington",
		abbr: "WA",
		maxDeposit: "No limit",
		returnDeadline: "30 days",
		itemizedRequired: true,
		interestRequired: false,
		notes:
			"Deposit needs a written lease and move-in checklist. Damage charges need estimates or invoices",
		citation: "RCW 59.18.280, 59.18.260",
		citationUrl: "https://app.leg.wa.gov/RCW/default.aspx?cite=59.18.280",
	},
	{
		state: "West Virginia",
		abbr: "WV",
		maxDeposit: "No limit",
		returnDeadline: "60 days (45 after new tenant)",
		itemizedRequired: true,
		interestRequired: false,
		notes:
			"Whichever period is shorter. Extra 15 days to itemize if a contractor is needed and the tenant is notified",
		citation: "W. Va. Code §§ 37-6A-1, 37-6A-2",
		citationUrl: "https://code.wvlegislature.gov/37-6A-2/",
	},
	{
		state: "Wisconsin",
		abbr: "WI",
		maxDeposit: "No limit",
		returnDeadline: "21 days",
		itemizedRequired: true,
		interestRequired: false,
		notes:
			"Landlord must give written notice that tenant may list pre-existing damage within 7 days of move-in",
		citation: "Wis. Stat. § 704.28; Wis. Admin. Code ATCP 134.06",
		citationUrl:
			"https://docs.legis.wisconsin.gov/code/admin_code/atcp/090/134/06",
	},
	{
		state: "Wyoming",
		abbr: "WY",
		maxDeposit: "No limit",
		returnDeadline: "30 days (60 if damage)",
		itemizedRequired: true,
		interestRequired: false,
		notes:
			"Or 15 days after the new mailing address, if later. Any nonrefundable portion must be disclosed in writing",
		citation: "Wyo. Stat. §§ 1-21-1207, 1-21-1208",
		citationUrl: "https://wyoleg.gov/statutes/compress/title01.pdf",
	},
];
