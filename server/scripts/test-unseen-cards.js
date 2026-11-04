const assert = require('assert');
const { extractContactFromText } = require('../src/services/extractionService');

/**
 * Comprehensive 14-Scenario Unseen Business Card Test Suite
 */
const SCENARIOS = [
  {
    name: '1. Completely unfamiliar company names',
    rawText: `Velox Dynamics Robotics Corp
Marcus Vance
VP of Autonomy
+1 (650) 441-9821
marcus@veloxdynamics.io
www.veloxdynamics.io
100 Industrial Parkway, Suite 250, San Jose, California`,
    assertions: (c) => {
      assert.strictEqual(c.company, 'Velox Dynamics Robotics Corp');
      assert.strictEqual(c.fullName, 'Marcus Vance');
      assert.strictEqual(c.designation, 'VP of Autonomy');
    }
  },
  {
    name: '2. Unfamiliar person names (Multi-word & Honorifics)',
    rawText: `Aura BioSciences LLP
Dr. Ananya Mukherjee
Chief Scientific Officer
+91 97123 45678
ananya.m@aurabio.co.in
Sector 5, Salt Lake, Kolkata, West Bengal 700091`,
    assertions: (c) => {
      assert.strictEqual(c.fullName, 'Dr. Ananya Mukherjee');
      assert.strictEqual(c.company, 'Aura BioSciences LLP');
      assert.strictEqual(c.city, 'Kolkata');
      assert.strictEqual(c.state, 'West Bengal');
    }
  },
  {
    name: '3. Different card layouts (Company bottom, person name top-center)',
    rawText: `Vikramaditya Solanki
Architectural Designer
Phone: 98251 22334
vikram@solankidesign.in
Plot 12, Ring Road, Surat, Gujarat
SOLANKI SPACES & ASSOCIATES`,
    assertions: (c) => {
      assert.strictEqual(c.fullName, 'Vikramaditya Solanki');
      assert.strictEqual(c.designation, 'Architectural Designer');
      assert.strictEqual(c.city, 'Surat');
      assert(c.company.includes('SOLANKI SPACES'));
    }
  },
  {
    name: '4. English-only cards',
    rawText: `Zentrix Global Technologies Ltd
Alexander Thorne
Principal Software Architect
Mobile: +91 91234 56789
alexander@zentrixglobal.com
https://www.zentrixglobal.com
Tower 4, Mindspace Business Park, Hyderabad, Telangana 500081`,
    assertions: (c) => {
      assert.strictEqual(c.fullName, 'Alexander Thorne');
      assert.strictEqual(c.company, 'Zentrix Global Technologies Ltd');
      assert.strictEqual(c.city, 'Hyderabad');
      assert.strictEqual(c.state, 'Telangana');
    }
  },
  {
    name: '5. Gujarati-only cards',
    rawText: `મારુતિ ટેકનોલોજી પ્રાઇવેટ લિમિટેડ
હર્ષદભાઈ પટેલ
મેનેજિંગ ડિરેક્ટર
મોબાઇલ: ૯૮૯૮૦ ૧૧૨૨૩
ફોન: ૦૨૬૧-૨૮૫૪૩૨૧
harshad@marutitech.co.in
www.marutitech.co.in
પ્લોટ નં. 45, જીઆઇડીસી, કતારગામ, સુરત, ગુજરાત - 395004`,
    assertions: (c) => {
      assert.strictEqual(c.fullName, 'હર્ષદભાઈ પટેલ');
      assert.strictEqual(c.company, 'મારુતિ ટેકનોલોજી પ્રાઇવેટ લિમિટેડ');
      assert.strictEqual(c.city, 'સુરત');
      assert.strictEqual(c.state, 'ગુજરાત');
    }
  },
  {
    name: '6. Hindi-only cards',
    rawText: `सूर्योदय एंटरप्राइजेज
विकास शर्मा
महाप्रबंधक
फोन: ९८११२ २३३४४
vikas@suryodaya.in
www.suryodaya.in
दुकान નં. 15, एम. आई. रोड, जयपुर, राजस्थान 302001`,
    assertions: (c) => {
      assert.strictEqual(c.fullName, 'विकास शर्मा');
      assert.strictEqual(c.company, 'सूर्योदय एंटरप्राइजेज');
      assert.strictEqual(c.city, 'जयपुर');
      assert.strictEqual(c.state, 'राजस्थान');
    }
  },
  {
    name: '7. Gujarati and English mixed cards',
    rawText: `SHRINATHJI TRADING COMPANY
પ્રવીણભાઈ શાહ
Proprietor
Mo. 97250 88990
pravin@shrinathji.com
www.shrinathjigroup.in
Ring Road, સુરત, Gujarat 395002`,
    assertions: (c) => {
      assert.strictEqual(c.fullName, 'પ્રવીણભાઈ શાહ');
      assert.strictEqual(c.company, 'SHRINATHJI TRADING COMPANY');
      assert.strictEqual(c.city, 'સુરત');
      assert.strictEqual(c.state, 'Gujarat');
    }
  },
  {
    name: '8. Hindi and English mixed cards',
    rawText: `AVALON HEALTHCARE SOLUTIONS
डॉ. दीपक वर्मा
Senior Consultant
Phone: +91 94140 12345
deepak.v@avalonhealth.org
एम. जी. मार्ग, नई दिल्ली, Delhi 110001`,
    assertions: (c) => {
      assert.strictEqual(c.fullName, 'डॉ. दीपक वर्मा');
      assert.strictEqual(c.company, 'AVALON HEALTHCARE SOLUTIONS');
      assert.strictEqual(c.city, 'नई दिल्ली');
    }
  },
  {
    name: '9. Multiple phone numbers (Primary & Alternate)',
    rawText: `Apex Logistics Ltd
Sameer Chawla
Director
Mobile: +91 98200 11223
Office: +91 22 2654 9988
Direct: +91 98200 44556
sameer@apexlogistics.com
Andheri East, Mumbai, Maharashtra`,
    assertions: (c) => {
      assert(c.phones.length >= 2);
      assert.strictEqual(c.phone, '+91 98200 11223');
      assert(c.alternatePhone.length > 0);
    }
  },
  {
    name: '10. Cards without email addresses',
    rawText: `Rajeshwar Hardware & Plywood
Rajesh Kumar
Proprietor
Mobile: 94250 12345
Opp. Bus Station, Baroda Road, Anand, Gujarat`,
    assertions: (c) => {
      assert.strictEqual(c.fullName, 'Rajesh Kumar');
      assert.strictEqual(c.company, 'Rajeshwar Hardware & Plywood');
      assert.strictEqual(c.email, '');
      assert.strictEqual(c.city, 'Anand');
    }
  },
  {
    name: '11. Cards without person names (Company-Only)',
    rawText: `BlueStar Logistics Solutions Pvt Ltd
Customer Support
All Types of Cold Storage & Freight Forwarding Services
Plot 88, Nh-8, Ankleshwar GIDC, Gujarat
Phone: +91 98790 33445
Email: support@bluestarfreight.com
Web: www.bluestarfreight.com`,
    assertions: (c) => {
      assert.strictEqual(c.fullName, '');
      assert.strictEqual(c.company, 'BlueStar Logistics Solutions Pvt Ltd');
      assert.strictEqual(c.needsReview, true);
    }
  },
  {
    name: '12. Cards with multiple employees (Partners / Founders)',
    rawText: `Horizon Creative Studio
Gaurav Dave & Neha Joshi
Partners
Phone: +91 98240 55667
partners@horizoncreative.in
Navrangpura, Ahmedabad, Gujarat`,
    assertions: (c) => {
      assert(c.people.length >= 2);
      assert(c.people.includes('Gaurav Dave'));
      assert(c.people.includes('Neha Joshi'));
    }
  },
  {
    name: '13. Front and back business-card images (Double-sided text)',
    rawText: `Samantha Reed
Head of AI Research
samantha@quantumailabs.io
--- BACK SIDE ---
Quantum AI Labs Inc.
500 Technology Square, Suite 300, Cambridge, Massachusetts
Phone: +1 (415) 555-2671
www.quantumailabs.io`,
    assertions: (c) => {
      assert.strictEqual(c.fullName, 'Samantha Reed');
      assert.strictEqual(c.company, 'Quantum AI Labs Inc.');
      assert.strictEqual(c.city, 'Cambridge');
      assert.strictEqual(c.state, 'Massachusetts');
    }
  },
  {
    name: '14. Cards with low-quality OCR output (OCR noise, stray brackets)',
    rawText: `| [=] ® NEXORA TECHNOLOGIES
= 2 Rahul Mehta
* Business Development Manager
(O) 98765 43210
/ rahul@nexora.in
~ Ring Road, Surat, Gujarat 395002`,
    assertions: (c) => {
      assert.strictEqual(c.fullName, 'Rahul Mehta');
      assert.strictEqual(c.company, 'NEXORA TECHNOLOGIES');
      assert.strictEqual(c.phone, '+91 98765 43210');
      assert.strictEqual(c.city, 'Surat');
    }
  }
];

function runTests() {
  console.log(`==================================================================`);
  console.log(`🧪 RUNNING 14-SCENARIO UNSEEN BUSINESS CARDS TEST SUITE`);
  console.log(`==================================================================\n`);

  let passedCount = 0;

  SCENARIOS.forEach((scenario, idx) => {
    try {
      console.log(`Testing Scenario ${scenario.name}...`);
      const extracted = extractContactFromText(scenario.rawText, 85);
      scenario.assertions(extracted);
      console.log(`✅ PASSED: ${scenario.name}\n`);
      passedCount++;
    } catch (err) {
      console.error(`❌ FAILED: ${scenario.name}`);
      console.error(err.message, '\n');
    }
  });

  console.log(`==================================================================`);
  console.log(`📊 TEST SUMMARY: ${passedCount}/${SCENARIOS.length} Scenarios Passed (${Math.round((passedCount / SCENARIOS.length) * 100)}%)`);
  console.log(`==================================================================\n`);

  if (passedCount !== SCENARIOS.length) {
    process.exit(1);
  }
}

runTests();
