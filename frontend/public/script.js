// API Base URL
const API_BASE_URL = '/api';

// Global state object
window.state = {};
window.months = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
const ACADEMIC_YEAR_START = 2024;
const MADRASA_INFO = {
    name: 'জামিয়া ইসলামিয়া রওজাতুল উলুম ফুরকানিয়া মাদ্‌রাসা',
    address: 'হাটগোবিন্দপুর, ফরিদপুর সদর',
    contact: 'মাওলানা মাহমুদুল হাসান - ০১৭৪৫-৩৩১৪৭৩'
};

// ===================================
// INITIALIZATION
// ===================================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/state`);
        if (!response.ok) throw new Error('Network response was not ok');
        const initialState = await response.json();
        
        const teacherProfile = { name: 'মুহাম্মদ আরিফ হাসান', photoUrl: 'https://placehold.co/100x100/6366f1/ffffff?text=MH' };
        const now = new Date();
        const config = getFeeConfig();
        const cashInHand = (initialState.management.totalCollected || 0) - (initialState.management.totalSubmittedToHeadmaster || 0);

        window.state = {
            currentClass: 'class_nurani',
            currentFeeType: 'monthly',
            currentSubFeeKey: config.subFees.exam.keys.term_1,
            allStudentsData: initialState.students,
            feeConfig: config,
            managementMetrics: { ...initialState.management, cashInHand },
            teacherProfile: teacherProfile,
            transactionHistory: initialState.transactions,
            currentDate: `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`,
            expandedStudentId: null,
            selectedStudentId: null,
            allocationReport: null,
            modalOpen: false,
            geminiLoading: false,
            generatedMessage: null,
            guardianReportData: null,
            reportSlipsData: null,
            smartAllocationData: null
        };
        
        updateStudentList();
    } catch (error) {
        console.error("Failed to fetch initial data:", error);
        const appContainer = document.getElementById('app-container');
        appContainer.innerHTML = `<div class="min-h-screen flex items-center justify-center bg-red-50 text-red-700">
            <div class="text-center p-8">
                <h2 class="text-xl font-bold mb-2">সার্ভার সংযোগ বিচ্ছিন্ন</h2>
                <p>ডেটা লোড করা সম্ভব হয়নি। অনুগ্রহ করে নিশ্চিত করুন যে backend সার্ভার (\'npm run dev\') চালু আছে।</p>
            </div>
        </div>`;
    }
});


// ===================================
// CONFIGURATION
// ===================================
const getFeeConfig = () => ({
    'rates': {
        'class_5': { 'monthly': 500, 'exam': 800, 'coaching': 1200, 'sports': 200, 'sheet': 150 },
        'class_4': { 'monthly': 450, 'exam': 750, 'coaching': 1000, 'sports': 200, 'sheet': 150 },
        'class_3': { 'monthly': 450, 'exam': 750, 'coaching': 1000, 'sports': 150, 'sheet': 100 },
        'class_2': { 'monthly': 400, 'exam': 700, 'coaching': 800, 'sports': 150, 'sheet': 100 },
        'class_1': { 'monthly': 350, 'exam': 600, 'coaching': 700, 'sports': 100, 'sheet': 50 },
        'class_nurani': { 'monthly': 300, 'exam': 500, 'coaching': 600, 'sports': 100, 'sheet': 50 },
    },
    'names': { 'monthly': 'মাসিক বেতন', 'exam': 'পরীক্ষার ফি', 'coaching': 'কোচিং ফি', 'sports': 'স্পোর্টস ফি', 'sheet': 'শিট বাবদ ফি' },
    'classNames': { 'class_nurani': 'নূরানী', 'class_1': '১ম শ্রেণী', 'class_2': '২য় শ্রেণী', 'class_3': '৩য় শ্রেণী', 'class_4': '৪র্থ শ্রেণী', 'class_5': '৫ম শ্রেণী' },
    'subFees': {
        'exam': { 'title': 'পরীক্ষার ধরণ', 'keys': { 'term_1': '১ম সাময়িক', 'term_2': '২য় সাময়িক', 'annual': 'বার্ষিক' } },
        'sheet': { 'title': 'শিটের সেট নম্বর', 'keys': { 'set_1': '১ম সেট', 'set_2': '২য় সেট', 'set_3': '৩য় সেট', 'set_4': '৪র্থ সেট', 'set_5': '৫ম সেট', 'set_6': '৬ষ্ঠ সেট' } }
    },
    'annualDueCheckFees': ['exam', 'sports', 'sheet', 'coaching']
});

// ===================================
// API COMMUNICATION
// ===================================
async function updateStudentOnServer(student) {
    try {
        const response = await fetch(`${API_BASE_URL}/students/${student.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fees: student.fees }),
        });
        if (!response.ok) throw new Error('Failed to update student on server');
        return await response.json();
    } catch (error) {
        console.error('Error updating student:', error);
        window.alertMessage('ছাত্রের তথ্য সার্ভারে আপডেট করা যায়নি।', 'error');
        return null;
    }
}

async function updateManagementOnServer(metrics) {
    try {
        const response = await fetch(`${API_BASE_URL}/management`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(metrics),
        });
        if (!response.ok) throw new Error('Failed to update management data');
        return await response.json();
    } catch (error) {
        console.error('Error updating management:', error);
        window.alertMessage('ম্যানেজমেন্ট তথ্য সার্ভারে আপডেট করা যায়নি।', 'error');
        return null;
    }
}

async function addTransactionOnServer(transaction) {
    try {
        const response = await fetch(`${API_BASE_URL}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transaction),
        });
        if (!response.ok) throw new Error('Failed to add transaction');
        return await response.json();
    } catch (error) {
        console.error('Error adding transaction:', error);
        window.alertMessage('ট্রানজ্যাকশন সার্ভারে যোগ করা যায়নি।', 'error');
        return null;
    }
}


// All other functions (getMonthKey, calculatePendingMonths, render functions, etc.)
// are copied here from the original HTML file's script tag, with a few modifications to handle API calls.
// Due to space limitations, only the modified core logic is shown below. The rendering logic remains identical.
// --- START of copied and modified functions ---

const getMonthKey = (feeType, year, month, subFeeKey = null) => { const datePart = `${year}_${month.toString().padStart(2, '0')}`; return (subFeeKey && feeType !== 'monthly') ? `${feeType}_${subFeeKey}_${datePart}` : `${feeType}_${datePart}`; };
const calculatePendingMonths = (student, currentYear, currentMonth, feeType, classRates, subFeeKey) => { const rate = classRates[feeType] || 0; if (rate === 0) return { pendingMonths: [], totalDue: 0, rate: 0 }; const pending = []; if (feeType === 'monthly') { const ceilingDate = new Date(currentYear, currentMonth - 1, 1); for (let y = ACADEMIC_YEAR_START; y <= currentYear; y++) { for (let m = 1; m <= (y === currentYear ? currentMonth : 12); m++) { if (new Date(y, m - 1, 1) > ceilingDate) continue; const key = getMonthKey(feeType, y, m, null); const isPaid = student.fees[key] && student.fees[key] >= rate; if (!isPaid) pending.push({ year: y, month: m, key: key, rate: rate, paidAmount: student.fees[key] || 0, dueAmount: rate - (student.fees[key] || 0) }); } } pending.sort((a, b) => a.year - b.year || a.month - b.month); } else { const key = getMonthKey(feeType, currentYear, currentMonth, subFeeKey); const isPaid = subFeeKey && student.fees[key] && student.fees[key] >= rate; if (subFeeKey && !isPaid) pending.push({ year: parseInt(currentYear), month: currentMonth, key: key, rate: rate, paidAmount: student.fees[key] || 0, dueAmount: rate - (student.fees[key] || 0) }); } return { pendingMonths: pending, totalDue: pending.reduce((sum, i) => sum + i.dueAmount, 0), rate: rate }; };
const calculateTotalOutstandingDue = () => { const { allStudentsData, feeConfig } = window.state; let totalDue = 0; for (const student of allStudentsData) { const report = calculateAllDuesForStudent(student); totalDue += report.totalDue; } return totalDue; };

window.allocateFee = (studentId, viewType = 'mobile') => {
    const { allStudentsData, currentFeeType, feeConfig } = window.state;
    const student = allStudentsData.find(s => s.id === studentId);
    if (!student) return;

    const inputId = `fee_input_${viewType}_${studentId}`;
    const paymentAmount = parseInt(document.getElementById(inputId)?.value) || 0;

    if (paymentAmount <= 0) return window.alertMessage("টাকার পরিমাণ দিন।", 'error');

    const allDues = getAllDuesForAllocation(student);

    if (allDues.length === 0) {
        const rate = feeConfig.rates[student.classId][currentFeeType];
        window.state.allocationReport = { 
            student, allocationLog: [], remainingAmount: paymentAmount, rate: rate, 
            feeType: currentFeeType, subFeeKey: window.state.currentSubFeeKey, 
            initialPaymentAmount: paymentAmount, action: 'confirm_future_payment' 
        };
        window.openModal('allocation_report');
        return;
    }
    
    let remainingToAllocate = paymentAmount;
    const allocationPlan = [];
    for (const dueItem of allDues) {
        if (remainingToAllocate <= 0) break;
        const amountToPay = Math.min(remainingToAllocate, dueItem.dueAmount);
        if (amountToPay > 0) {
             allocationPlan.push({ ...dueItem, amountToPay: amountToPay });
        }
        remainingToAllocate -= amountToPay;
    }

    window.state.smartAllocationData = {
        student, plan: allocationPlan, initialPayment: paymentAmount,
        remainingChange: remainingToAllocate
    };
    window.openModal('smart_allocation_report');
};

window.confirmSmartAllocation = async () => {
    const { student, plan, initialPayment } = window.state.smartAllocationData;
    if (!student || !plan) return;

    const allocationLogForReport = [];
    plan.forEach(item => {
        const newPaidAmount = (student.fees[item.key] || 0) + item.amountToPay;
        student.fees[item.key] = newPaidAmount;
        allocationLogForReport.push({
            monthName: `${item.feeName} - ${item.description}`, paid: item.amountToPay,
            status: newPaidAmount >= item.rate ? 'পরিশোধিত' : 'আংশিক',
            totalDue: item.rate, feeType: 'Mixed', subFee: null
        });
    });

    window.state.modalOpen = false;
    await saveStudentFees(student, allocationLogForReport, initialPayment);
};

window.allocateFutureFee = async (studentId, remainingAmount, rate, feeType, subFeeKey, initialLog, initialPaymentAmount) => { 
    const student = window.state.allStudentsData.find(s => s.id === studentId); 
    const allocationLog = initialLog || []; 
    const now = new Date(); 
    let month = now.getMonth() + 2; 
    let year = now.getFullYear(); 
    while (remainingAmount > 0 && year < now.getFullYear() + 3) { 
        if (month > 12) { month = 1; year++; } 
        const key = getMonthKey(feeType, year, month, feeType !== 'monthly' ? subFeeKey : null); 
        const amountToPay = Math.min(remainingAmount, rate); 
        const alreadyPaid = student.fees[key] || 0; 
        const finalAmount = alreadyPaid + amountToPay; 
        if (finalAmount <= rate) { 
            student.fees[key] = finalAmount; 
            remainingAmount -= amountToPay; 
            allocationLog.push({ monthName: getMonthName(year, month), paid: amountToPay, status: finalAmount >= rate ? 'অগ্রিম' : 'আংশিক অগ্রিম', totalDue: rate, feeType: feeType, subFee: subFeeKey }); 
        } else { 
            const availableForMonth = rate - alreadyPaid; 
            if (availableForMonth > 0) { 
                student.fees[key] = rate; 
                remainingAmount -= availableForMonth; 
                allocationLog.push({ monthName: getMonthName(year, month), paid: availableForMonth, status: 'অগ্রিম', totalDue: rate, feeType: feeType, subFee: subFeeKey }); 
            } 
        } 
        if (feeType !== 'monthly') break; 
        month++; 
    } 
    await saveStudentFees(student, allocationLog, initialPaymentAmount); 
};

async function saveStudentFees(student, allocationLog, initialPaymentAmount = 0) {
    if (!student) return;

    // 1. Update student data on the server
    const updatedStudent = await updateStudentOnServer(student);
    if (!updatedStudent) return; // Stop if server update fails

    // 2. Update local state for student
    const studentIndex = window.state.allStudentsData.findIndex(s => s.id === student.id);
    if (studentIndex !== -1) {
        window.state.allStudentsData[studentIndex] = updatedStudent;
    }

    if (initialPaymentAmount > 0) {
        // 3. Update management metrics
        const { managementMetrics } = window.state;
        managementMetrics.totalCollected += initialPaymentAmount;
        managementMetrics.cashInHand += initialPaymentAmount;
        
        const metricsToUpdate = {
            totalCollected: managementMetrics.totalCollected,
            totalSubmittedToHeadmaster: managementMetrics.totalSubmittedToHeadmaster
        };
        const updatedMetrics = await updateManagementOnServer(metricsToUpdate);
        if(!updatedMetrics) return;

        // 4. Create and save new transaction
        const feeDisplayName = 'বিভিন্ন ফি';
        const newTransaction = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            studentId: student.id,
            studentName: student.name,
            amountReceived: initialPaymentAmount,
            feeType: feeDisplayName,
            allocationLog: allocationLog
        };
        const savedTransaction = await addTransactionOnServer(newTransaction);
        if(!savedTransaction) return;
        
        // 5. Update local state for management and transactions
        window.state.managementMetrics.totalCollected = updatedMetrics.totalCollected;
        window.state.managementMetrics.totalSubmittedToHeadmaster = updatedMetrics.totalSubmittedToHeadmaster;
        window.state.managementMetrics.cashInHand = updatedMetrics.totalCollected - updatedMetrics.totalSubmittedToHeadmaster;
        window.state.transactionHistory.unshift(savedTransaction);
    }
    
    // 6. Update UI
    window.state.allocationReport = { student, allocationLog, action: 'show_report' };
    window.state.expandedStudentId = null;
    window.state.selectedStudentId = student.id; // Keep student selected
    updateStudentList(); // This calls renderApp()
    window.openModal('allocation_report');
}


window.submitCashToHeadmaster = async () => { 
    const { managementMetrics } = window.state; 
    const amount = managementMetrics.cashInHand; 
    if (amount <= 0) return window.alertMessage("জমা দেওয়ার মতো কোনো টাকা নেই।", 'info'); 
    
    const newMetrics = {
        totalCollected: managementMetrics.totalCollected,
        totalSubmittedToHeadmaster: managementMetrics.totalSubmittedToHeadmaster + amount
    };
    
    const updatedMetrics = await updateManagementOnServer(newMetrics);
    if (updatedMetrics) {
        window.state.managementMetrics.totalSubmittedToHeadmaster = updatedMetrics.totalSubmittedToHeadmaster;
        window.state.managementMetrics.cashInHand = updatedMetrics.totalCollected - updatedMetrics.totalSubmittedToHeadmaster;
        window.alertMessage(`${amount.toLocaleString('bn-BD')} ৳ সফলভাবে জমা দেওয়া হয়েছে।`, 'success');
        updateStudentList();
    }
};

// --- START of rendering and other helper functions ---
// NOTE: All render functions from the original file are placed here.
// They are identical and not repeated for brevity.
// Example: renderApp, renderDashboard, renderStudentCard, etc.
// --- The following is a placeholder for all rendering functions ---
const getAllDuesForAllocation=(s)=>{const{feeConfig:e}=window.state,t=new Date,a=t.getFullYear(),o=t.getMonth()+1,n=e.rates[s.classId],r=[];for(let t=ACADEMIC_YEAR_START;t<=a;t++){const n=t===a?o:12;for(let a=1;a<=n;a++){const o=getMonthKey("monthly",t,a),n=e.rates[s.classId].monthly,i=s.fees[o]||0;i<n&&r.push({feeName:e.names.monthly,description:getMonthName(t,a),dueAmount:n-i,paidSoFar:i,rate:n,key:o,year:t,month:a,priority:1})}}for(const t in e.names){if("monthly"===t)continue;if(e.annualDueCheckFees.includes(t)){const o=n[t]||0;if(0!==o)if(e.subFees[t])for(const n in e.subFees[t].keys){const i=getMonthKey(t,a,1,n),l=s.fees[i]||0;l<o&&r.push({feeName:e.names[t],description:e.subFees[t].keys[n],dueAmount:o-l,paidSoFar:l,rate:o,key:i,year:a,month:0,priority:2})}else{const n=getMonthKey(t,a,1),i=s.fees[n]||0;i<o&&r.push({feeName:e.names[t],description:`${a} সাল`,dueAmount:o-i,paidSoFar:i,rate:o,key:n,year:a,month:0,priority:2})}}}return r.sort((e,t)=>e.priority!==t.priority?e.priority-t.priority:e.year!==t.year?e.year-t.year:e.month-t.month),r};
const calculateAllDuesForStudent=(s)=>{const e=getAllDuesForAllocation(s),t=e.reduce((e,t)=>e+t.dueAmount,0);return{studentDetails:{name:s.name,id:s.id,class:window.state.feeConfig.classNames[s.classId]},dueItems:e.map(e=>({feeName:e.feeName,description:e.description,amount:e.dueAmount})),totalDue:t}};
window.generateClassDueReport=()=>{const{students:e}=window.state;if(!e||0===e.length)return window.alertMessage("এই ক্লাসে কোনো শিক্ষার্থী নেই।","info");const t=e.map(e=>calculateAllDuesForStudent(e)).filter(e=>e.totalDue>0);if(0===t.length)return window.alertMessage("এই ক্লাসের সকল শিক্ষার্থীর ফি পরিশোধিত।","success");window.state.reportSlipsData=t,window.openModal("print_report")},window.generateIndividualDueReport=e=>{const t=window.state.allStudentsData.find(t=>t.id===e);if(!t)return;const a=calculateAllDuesForStudent(t);if(0===a.totalDue)return window.alertMessage("এই শিক্ষার্থীর কোনো বকেয়া নেই।","success");window.state.reportSlipsData=[a],window.openModal("print_report")};
const calculateCurrentFeeTypeDue=e=>{const{currentFeeType:t,currentSubFeeKey:a,feeConfig:o,currentDate:n}=window.state,[,r]=n.split("-"),s=parseInt(r,10),i=o.rates[e.classId],l=i[t]||0;if(0===l)return{totalDue:0};let d=0;if("monthly"===t){const{totalDue:t}=calculatePendingMonths(e,parseInt(n.split("-")[0]),s,"monthly",i,null);d=t}else if(o.subFees[t]){const n=o.subFees[t];if(a&&n.keys[a]){const a=getMonthKey(t,parseInt(n.split("-")[0]),1,a),o=e.fees[a]||0;o<l&&(d=l-o)}else for(const a in n.keys){const r=getMonthKey(t,parseInt(n.split("-")[0]),1,a),s=e.fees[r]||0;s<l&&(d+=l-s)}}else{const a=getMonthKey(t,parseInt(n.split("-")[0]),1),o=e.fees[a]||0;o<l&&(d=l-o)}return{totalDue:d}};
window.generateGuardianReport=e=>{const t=window.state.allStudentsData.find(t=>t.id===e);if(!t)return window.alertMessage("ছাত্র খুঁজে পাওয়া যায়নি!","error");const a={student:t,class:window.state.feeConfig.classNames[t.classId],feeDetails:[],totalPaid:0,totalDue:0},o=new Date,n=o.getFullYear(),r=o.getMonth()+1,s=window.state.feeConfig.rates[t.classId];Object.keys(window.state.feeConfig.names).forEach(e=>{const o=s[e]||0;if(0===o)return;const i={name:window.state.feeConfig.names[e],paidList:[],dueList:[],paidAmount:0,dueAmount:0};if("monthly"===e)for(let a=ACADEMIC_YEAR_START;a<=n;a++)for(let n=1;n<=(a===n?r:12);n++){const r=getMonthKey(e,a,n),s=t.fees[r]||0;i.paidAmount+=s,s>=o?i.paidList.push(window.months[n-1]):s<o&&(r=o-s,i.dueAmount+=r,i.dueList.push(`${window.months[n-1]} (${r.toLocaleString("bn-BD")}৳)`))}else window.state.feeConfig.subFees[e]&&Object.keys(window.state.feeConfig.subFees[e].keys).forEach(a=>{const n=getMonthKey(e,n,r,a),s=t.fees[n]||0,l=window.state.feeConfig.subFees[e].keys[a];i.paidAmount+=s,s>=window.state.feeConfig.rates[t.classId][e]&&i.paidList.push(l)});(i.paidAmount>0||i.dueAmount>0)&&a.feeDetails.push(i),a.totalPaid+=i.paidAmount,a.totalDue+=i.dueAmount}),window.state.guardianReportData=a,window.openModal("guardian_report")};
const formatReportForSharing=e=>{let t="*ফি রিপোর্ট*\n\n";return t+=`নাম: *${e.student.name}*\n`,t+=`শ্রেণী: *${e.class}*\n`,t+=`ID: ${e.student.id}\n`,t+="--------------------------\n",t+=`মোট পরিশোধিত: *${e.totalPaid.toLocaleString("bn-BD")} ৳*\n`,t+=`মোট বকেয়া: *${e.totalDue.toLocaleString("bn-BD")} ৳*\n`,t+="--------------------------\n\n",e.feeDetails.forEach(e=>{t+=`*${e.name}*\n`,e.paidList.length>0&&(t+=`  - পরিশোধিত: ${e.paidList.join(", ")}\n`),e.dueList.length>0&&(t+=`  - বকেয়া: ${e.dueList.join(", ")}\n`),t+="\n"}),t+=`তারিখ: ${new Date().toLocaleDateString("bn-BD")}\nস্কুল কর্তৃপক্ষ`};
window.shareViaWhatsApp=()=>{const e=window.state.guardianReportData;if(e){const t=formatReportForSharing(e),a=`https://wa.me/?text=${encodeURIComponent(t)}`;window.open(a,"_blank")}},window.copyReportForSms=()=>{const e=window.state.guardianReportData;if(e){const t=formatReportForSharing(e).replace(/\*/g,"");copyToClipboard(t)}};
window.alertMessage=(e,t="info")=>{const a=document.getElementById("custom-alert");if(!a)return;a.textContent=e,a.className="fixed top-5 right-5 z-[100] p-4 rounded-xl shadow-2xl text-white font-bold text-base transition-all duration-300 transform opacity-100 scale-100";let o="bg-blue-600";"success"===t?o="bg-green-600":"error"===t&&(o="bg-red-600"),a.classList.add(o),setTimeout(()=>{a.className+=" opacity-0 -translate-y-5"},3e3)};
const scrollActiveButtonIntoView=(e,t)=>{const a=document.querySelector(t);if(e&&a){const t=e.getBoundingClientRect(),o=a.getBoundingClientRect(),n=t.left-o.left,r=o.width/2-t.width/2,s=a.scrollLeft+n-r;a.scrollTo({left:s,behavior:"smooth"})}};
window.changeClass=e=>{window.state.currentClass!==e&&(window.state.currentClass=e,window.state.expandedStudentId=null,window.state.selectedStudentId=null,updateStudentList(),setTimeout(()=>{scrollActiveButtonIntoView(document.querySelector(".class-btn.bg-indigo-600"),".class-buttons-container")},50))},window.changeFeeType=e=>{if(window.state.currentFeeType===e)return;window.state.currentFeeType=e,window.state.expandedStudentId=null,window.state.selectedStudentId=null;const t=getFeeConfig().subFees[e];window.state.currentSubFeeKey=t?Object.keys(t.keys)[0]:null,updateStudentList(),setTimeout(()=>{scrollActiveButtonIntoView(document.querySelector(".fee-btn.bg-purple-600"),".fee-buttons-container")},50)},window.changeSubFee=e=>{window.state.currentSubFeeKey=e,window.state.expandedStudentId=null,window.state.selectedStudentId=null,updateStudentList()},window.changeDate=e=>{window.state.currentDate=e,window.state.expandedStudentId=null,window.state.selectedStudentId=null,updateStudentList()},window.toggleExpansion=e=>{window.state.expandedStudentId=window.state.expandedStudentId===e?null:e,renderApp()};
const updateStudentList=()=>{window.state.students=(window.state.allStudentsData||[]).filter(e=>e.classId===window.state.currentClass).sort((e,t)=>parseInt(e.id)-parseInt(t.id)),renderApp()};
window.handleStudentClick=e=>{window.innerWidth<1024?(window.state.selectedStudentId=null,window.toggleExpansion(e)):(window.state.expandedStudentId=null,window.state.selectedStudentId=window.state.selectedStudentId===e?null:e,renderApp())},window.openModal=e=>{window.state.modalType=e,window.state.modalOpen=!0,renderApp(),setTimeout(()=>{const e=document.getElementById("modal-content-wrapper");e&&e.classList.remove("modal-enter")},10)},window.closeModal=()=>{const e=document.getElementById("modal-content-wrapper");e&&e.classList.add("modal-enter"),setTimeout(()=>{window.state.modalOpen=!1,window.state.allocationReport=null,window.state.generatedMessage=null,window.state.guardianReportData=null,window.state.reportSlipsData=null,window.state.smartAllocationData=null,renderApp()},200)},window.confirmFuturePayment=()=>{const e=window.state.allocationReport,t=e.initialPaymentAmount;window.closeModal(),e&&"confirm_future_payment"===e.action&&window.allocateFutureFee(e.student.id,e.remainingAmount,e.rate,e.feeType,e.subFeeKey,e.allocationLog,t)};
const renderStandardModal=(e,t,a,o="max-w-md")=>`<div class="fixed inset-0 flex items-center justify-center z-50 p-4"><div class="modal-backdrop absolute inset-0" onclick="window.closeModal()"></div><div id="modal-content-wrapper" class="bg-white rounded-xl shadow-2xl p-6 w-full ${o} relative modal-enter"><button onclick="window.closeModal()" class="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors no-print"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button><h3 class="text-xl font-extrabold text-indigo-700 border-b pb-3 mb-4 no-print">${e}</h3>${t}<div class="flex justify-end pt-4 border-t mt-4 space-x-3 no-print">${a}</div></div></div>`;
window.renderHistoryModal=()=>{const e=window.state.transactionHistory,t=e.map((t,a)=>{const o=new Date(t.date);return`<tr class="border-b hover:bg-gray-50 text-sm"><td class="p-2 text-center text-gray-500">${(e.length-a).toLocaleString("bn-BD")}</td><td class="p-2 font-medium">${t.studentId}</td><td class="p-2">${t.studentName}</td><td class="p-2 font-bold text-green-700 text-right">${t.amountReceived.toLocaleString("bn-BD")} ৳</td><td class="p-2 text-indigo-600">${t.feeType}</td><td class="p-2 text-xs text-gray-600">${o.toLocaleDateString("bn-BD")}<br>${o.toLocaleTimeString("bn-BD")}</td></tr>`}).join(""),a=0===e.length?`<div class="p-4 text-center text-gray-500 bg-gray-50 rounded-lg">কোনো ট্রানজেকশন রেকর্ড নেই।</div>`:`<div class="overflow-auto max-h-[70vh] shadow-inner rounded-lg border"><table class="min-w-full"><thead class="bg-gray-50 sticky top-0 z-10"><tr><th class="p-2 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">#</th><th class="p-2 text-xs font-bold text-gray-500 uppercase tracking-wider text-left">আইডি</th><th class="p-2 text-xs font-bold text-gray-500 uppercase tracking-wider text-left">নাম</th><th class="p-2 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">পরিমাণ</th><th class="p-2 text-xs font-bold text-gray-500 uppercase tracking-wider text-left">ফি ধরণ</th><th class="p-2 text-xs font-bold text-gray-500 uppercase tracking-wider text-left">তারিখ</th></tr></thead><tbody class="bg-white divide-y">${t}</tbody></table></div>`;return renderStandardModal("ট্রানজেকশন হিস্টরি",a,`<button onclick="window.closeModal()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition-transform transform hover:scale-105">বন্ধ করুন</button>`,"max-w-4xl")};
const renderGuardianReportModal=()=>{const e=window.state.guardianReportData;if(!e)return"";const t=`ফি রিপোর্ট: ${e.student.name}`,a=`<div class="space-y-4 max-h-[60vh] overflow-y-auto pr-2"><div class="grid grid-cols-2 gap-4 text-sm bg-indigo-50 p-3 rounded-lg"><div><span class="font-semibold text-gray-600">শ্রেণী:</span> <span class="font-bold text-indigo-800">${e.class}</span></div><div><span class="font-semibold text-gray-600">ID:</span> <span class="font-bold text-indigo-800">${e.student.id}</span></div><div class="col-span-2 border-t pt-2 mt-2"><span class="font-semibold text-gray-600">মোট পরিশোধিত:</span> <span class="font-extrabold text-green-600 text-base">${e.totalPaid.toLocaleString("bn-BD")} ৳</span></div><div class="col-span-2"><span class="font-semibold text-gray-600">মোট বকেয়া:</span> <span class="font-extrabold text-red-600 text-base">${e.totalDue.toLocaleString("bn-BD")} ৳</span></div></div>${e.feeDetails.map(e=>`<div class="border rounded-lg p-3"><h4 class="font-bold text-purple-700">${e.name}</h4><div class="text-xs space-y-1 mt-2">${e.paidList.length>0?`<p><span class="font-semibold text-green-700">✓ পরিশোধিত:</span> ${e.paidList.join(", ")}</p>`:""}${e.dueList.length>0?`<p><span class="font-semibold text-red-700">✗ বকেয়া:</span> ${e.dueList.join(", ")}</p>`:""}${0===e.paidList.length&&0===e.dueList.length?`<p class="text-gray-500">কোনো তথ্য নেই</p>`:""}</div></div>`).join("")}</div>`,o=`<button onclick="window.copyReportForSms()" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg flex items-center transition-transform transform hover:scale-105"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 mr-2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>SMS কপি</button><button onclick="window.shareViaWhatsApp()" class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg flex items-center transition-transform transform hover:scale-105"><svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.956-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.886-.001 2.267.655 4.398 1.908 6.161l-1.317 4.814 4.901-1.282z"></path></svg>WhatsApp</button>`;return renderStandardModal(t,a,o,"max-w-lg")};
const renderSmartAllocationModal=()=>{const{student:e,plan:t,initialPayment:a,remainingChange:o}=window.state.smartAllocationData;if(!e||!t)return"";const n="ফি বন্টন প্রস্তাব",r=t.map(e=>`<li class="flex justify-between items-center py-2 border-b last:border-0"><div class="pr-2"><p class="font-semibold text-gray-800 text-sm">${e.feeName}</p><p class="text-xs text-gray-500">${e.description}</p></div><p class="font-bold text-green-700 text-sm whitespace-nowrap">${e.amountToPay.toLocaleString("bn-BD")} ৳ (${e.amountToPay>=e.dueAmount?"পরিশোধিত":"আংশিক"})</p></li>`).join(""),s=`<div class="space-y-3"><div class="bg-indigo-50 p-3 rounded-lg text-sm"><p><strong>নাম:</strong> ${e.name}</p><p><strong>প্রদত্ত টাকা:</strong> <span class="font-bold text-lg">${a.toLocaleString("bn-BD")} ৳</span></p></div><h4 class="font-bold text-indigo-700">প্রস্তাবিত বন্টন:</h4><ul class="max-h-60 overflow-y-auto pr-2 bg-gray-50 p-2 rounded-lg border">${t.length>0?r:`<li class="text-center text-gray-500 py-4">কোনো বকেয়া নেই।</li>`}</ul><div class="pt-3 border-t text-base font-bold"><div class="flex justify-between"><span>মোট বন্টন হবে:</span><span>${(a-o).toLocaleString("bn-BD")} ৳</span></div>${o>0?`<div class="flex justify-between text-blue-600"><span>অতিরিক্ত থাকবে:</span><span>${o.toLocaleString("bn-BD")} ৳</span></div><p class="text-xs text-gray-500 font-normal mt-1">অতিরিক্ত টাকা কোনো খাতে জমা হবে না।</p>`:""}</div></div>`,i=`<button onclick="window.closeModal()" class="bg-gray-300 hover:bg-gray-400 font-bold py-2 px-4 rounded-lg">বাতিল</button><button onclick="window.confirmSmartAllocation()" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg">নিশ্চিত করুন</button>`;return renderStandardModal(n,s,i,"max-w-lg")};
const renderModalContent = () => {
    const e = window.state.modalType;
    if ("allocation_report" === e) {
        const t = window.state.allocationReport;
        if (!t) return "";
        let a, o, n;
        const r = window.state.feeConfig.names[t.feeType] || "ফি";
        if ("show_report" === t.action) {
            a = "✅ সফলভাবে সেভ হয়েছে";
            const totalPaid = t.allocationLog.reduce((e, t) => e + t.paid, 0);
            o = `<p class="text-sm mb-4">ছাত্র: <span class="font-bold text-indigo-700">${t.student.name}</span></p>
                <div class="space-y-2 max-h-60 overflow-y-auto p-2 bg-gray-50 rounded-lg border">
                    ${t.allocationLog.map(e => {
                        let subFeeText = e.subFee ? ` (${window.state.feeConfig.subFees[e.feeType].keys[e.subFee]})` : "";
                        return `<div class="flex justify-between text-sm items-center ${e.status.includes("পরিশোধিত") || e.status.includes("অগ্রিম") ? "text-green-700" : "text-orange-700"}">
                            <span class="font-medium">${e.monthName}${subFeeText}</span>
                            <span class="font-bold">${e.paid.toLocaleString("bn-BD")} ৳ (${e.status})</span>
                        </div>`;
                    }).join("")}
                </div>
                <p class="font-bold text-indigo-600 mt-3 text-base">মোট জমা: ${totalPaid.toLocaleString("bn-BD")} ৳</p>`;
            n = `<button onclick="window.closeModal()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg">বন্ধ করুন</button>`;
        } else if ("confirm_future_payment" === t.action) {
            a = "⚠️ অগ্রিম ফি?";
            o = `<p class="text-sm mb-4">এই ছাত্রের কোনো বকেয়া নেই। প্রদত্ত <span class="font-bold text-green-700">${t.remainingAmount.toLocaleString("bn-BD")} ৳</span> <span class="font-bold text-purple-600">${r}</span> বাবদ অগ্রিম রাখতে চান?</p>`;
            n = `<button onclick="window.closeModal()" class="bg-gray-300 hover:bg-gray-400 font-bold py-2 px-4 rounded-lg">না</button>
                <button onclick="window.confirmFuturePayment()" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">হ্যাঁ, বরাদ্দ করুন</button>`;
        }
        return renderStandardModal(a, o, n);
    }
    if ("message_report" === e) {
        const msg = window.state.generatedMessage;
        return msg
            ? renderStandardModal(
                "✨ অভিভাবকের জন্য মেসেজ",
                `<p class="text-sm mb-2">জেমিনি দ্বারা তৈরি মেসেজ:</p>
                <div class="p-3 bg-gray-100 rounded-lg border text-sm whitespace-pre-wrap">${msg}</div>`,
                `<button onclick="window.closeModal()" class="bg-gray-300 hover:bg-gray-400 font-bold py-2 px-4 rounded-lg">বন্ধ করুন</button>
                <button onclick="window.copyToClipboard('${msg.replace(/'/g, "\\'")}')" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center">
                    <svg class="w-4 h-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z"/><path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h6a2 2 0 00-2-2H5z"/></svg> কপি করুন</button>`
            )
            : "";
    }
    return "history_report" === e
        ? window.renderHistoryModal()
        : "guardian_report" === e
        ? renderGuardianReportModal()
        : "print_report" === e
        ? renderPrintReportModal()
        : "smart_allocation_report" === e
        ? renderSmartAllocationModal()
        : "";
};
const renderFeeTypeSelector=()=>{const{feeConfig:e,currentFeeType:t}=window.state,a=Object.entries(e.names).map(([a,o])=>`<button onclick="window.changeFeeType('${a}')" class="fee-btn py-2 px-4 rounded-full text-xs font-bold transition-all duration-300 flex-shrink-0 whitespace-nowrap shadow-sm ${a===t?"bg-purple-600 text-white shadow-lg transform scale-105":"bg-white text-gray-700 border hover:bg-purple-50 hover:border-purple-300"}">${o}</button>`).join("");return`<div class="bg-white p-3 rounded-xl shadow-md"><h3 class="text-sm font-semibold text-gray-700 mb-2">💸 ফি'র ধরণ</h3><div class="slide-nav fee-buttons-container flex space-x-2 overflow-x-scroll pb-1">${a}</div></div>`};
const renderSubFeeSelector=()=>{const{feeConfig:e,currentFeeType:t,currentSubFeeKey:a}=window.state,o=e.subFees[t];if(!o)return`<div class="bg-gray-100 p-3 rounded-xl h-full flex items-center justify-center"><p class="text-xs text-gray-600">কোনো উপ-বিভাগ নেই।</p></div>`;const n=Object.entries(o.keys).map(([e,t])=>`<button onclick="window.changeSubFee('${e}')" class="sub-fee-btn py-1.5 px-3 rounded-lg text-xs font-medium transition-all duration-200 ${e===a?"bg-indigo-600 text-white shadow":"bg-white text-gray-700 border hover:bg-indigo-50"}">${t}</button>`).join("");return`<div class="bg-white p-3 rounded-xl shadow-md h-full"><h3 class="text-sm font-semibold text-gray-700 mb-2">${o.title}</h3><div class="flex flex-wrap gap-2">${n}</div></div>`};
const renderDatePicker=e=>`<input type="month" id="month_year_selector" value="${e}" max="${(new Date).getFullYear()}-${((new Date).getMonth()+1).toString().padStart(2,"0")}" onchange="window.changeDate(this.value)" class="shadow-inner border-indigo-300 focus:ring-indigo-500 text-sm font-semibold">`;
const renderTeacherSummary=()=>{const{teacherProfile:e,managementMetrics:t}=window.state,a=calculateTotalOutstandingDue(),o=t.cashInHand,n=[{l:"মোট সংগৃহীত",v:t.totalCollected,c:"text-green-600",i:`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>`},{l:"জমা হয়েছে",v:t.totalSubmittedToHeadmaster,c:"text-blue-600",i:`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`},{l:"মোট বকেয়া",v:a,c:"text-red-600",i:`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`}];return`<div class="bg-white rounded-2xl shadow-lg p-5 mb-5 border border-indigo-100"><div class="flex flex-col md:flex-row items-start md:items-center justify-between border-b pb-4 mb-4 space-y-4 md:space-y-0"><div class="flex items-center space-x-4"><img src="${e.photoUrl}" alt="শিক্ষক" class="w-14 h-14 rounded-full border-2 border-indigo-400 object-cover shadow-md"><div><p class="text-xl font-extrabold text-gray-900">${e.name}</p><p class="text-sm text-gray-500">ফি সংগ্রাহক</p></div></div><div class="text-right p-3 bg-indigo-600 text-white rounded-xl shadow-xl w-full md:w-auto"><p class="text-sm font-medium opacity-90">হাতে আছে (জমাযোগ্য)</p><p class="text-3xl font-extrabold">${o.toLocaleString("bn-BD")} ৳</p></div></div><div class="flex flex-col md:flex-row md:space-x-5"><div class="grid grid-cols-2 lg:grid-cols-3 gap-3 md:w-3/4 mb-4 md:mb-0">${n.map(e=>`<div class="bg-slate-50 p-3 rounded-lg border"><div class="flex items-center space-x-2 text-xs font-medium text-gray-500 mb-1">${e.i} <span>${e.l}</span></div><p class="text-xl font-bold ${e.c}">${e.v.toLocaleString("bn-BD")} ৳</p></div>`).join("")}</div><div class="md:w-1/4 flex flex-col justify-end pt-2 md:pt-0 space-y-2 w-full"><button onclick="window.openModal('history_report')" class="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105 text-sm flex items-center justify-center space-x-2"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M12 8v4l2 2"/></svg><span>হিস্টরি (${window.state.transactionHistory.length.toLocaleString("bn-BD")})</span></button><button onclick="window.submitCashToHeadmaster()" class="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold py-2.5 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105 disabled:bg-blue-400 text-sm" ${o<=0?"disabled":""}>জমা দিন (${o.toLocaleString("bn-BD")} ৳)</button></div></div></div>`};
const renderStudentDetailsPanel=()=>{const{selectedStudentId:e,allStudentsData:t,feeConfig:a}=window.state;if(!e)return`<div class="h-full flex flex-col items-center justify-center bg-white/50 rounded-2xl border-2 border-dashed border-gray-300 p-8 text-center sticky top-5"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400 mb-4"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="m12 13-2-2 2-2"/><path d="m8 11 h5.5"/></svg><h3 class="text-lg font-bold text-gray-700">শিক্ষার্থীর বিবরণ দেখুন</h3><p class="text-sm text-gray-500 mt-1">তালিকা থেকে একজন শিক্ষার্থী নির্বাচন করুন।</p></div>`;const o=t.find(t=>t.id===e);if(!o)return"";const{totalDue:n}=calculateAllDuesForStudent(o);return`<div class="bg-white rounded-2xl shadow-lg p-5 sticky top-5 border border-indigo-100"><div class="flex items-center space-x-3 pb-3 border-b mb-4"><div class="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">${o.name.charAt(0)}</div><div><h3 class="font-extrabold text-gray-800 text-lg">${o.name}</h3><p class="text-xs text-gray-500">ID: ${o.id} | শ্রেণী: ${a.classNames[o.classId]}</p></div></div><h4 class="text-base font-bold text-gray-700 mb-3">ফি জমা দিন (স্মার্ট অ্যালকেশন)</h4><div class="flex flex-col md:flex-row items-end space-y-2 md:space-y-0 md:space-x-4"><div class="w-full"><label for="fee_input_desktop_${o.id}" class="block text-xs font-semibold text-gray-600 mb-1">টাকার পরিমাণ</label><input id="fee_input_desktop_${o.id}" type="number" placeholder="৳ ${n.toLocaleString("bn-BD")}" min="0" class="w-full p-2 border-2 border-indigo-300 rounded-lg text-base text-center font-bold focus:ring-indigo-500 transition"></div><button onclick="window.allocateFee('${o.id}', 'desktop')" class="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded-lg shadow transition-transform transform hover:scale-105 flex-shrink-0">সেভ করুন</button></div><div class="mt-3 text-xs text-gray-600 p-2 bg-indigo-50 rounded-lg"><span class="font-bold">সর্বমোট বকেয়া: ${n.toLocaleString("bn-BD")} ৳।</span> টাকা জমা দিলে সিস্টেম স্বয়ংক্রিয়ভাবে সকল বকেয়া পরিশোধ করবে।</div></div>`};
const renderAllDuesSummaryHTML=e=>{const t=calculateAllDuesForStudent(e);if(0===t.totalDue)return`<div class="p-4 text-center text-green-700 bg-green-50 rounded-lg"><p class="font-bold">এই শিক্ষার্থীর কোনো বকেয়া নেই।</p></div>`;const a=t.dueItems.map(e=>`<li class="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0"><div><p class="font-semibold text-gray-800 text-sm">${e.feeName}</p><p class="text-xs text-gray-500">${e.description}</p></div><p class="font-bold text-red-600 text-sm">${e.amount.toLocaleString("bn-BD")} ৳</p></li>`).join("");return`<div class="p-3 bg-indigo-50 border-t border-indigo-200"><h4 class="font-bold text-indigo-800 mb-2 text-base border-b pb-2">সকল বকেয়ার বিবরণ</h4><ul class="max-h-60 overflow-y-auto pr-2">${a}</ul><div class="flex justify-between items-center mt-3 pt-3 border-t font-extrabold text-lg"><span class="text-gray-800">সর্বমোট বকেয়া:</span><span class="text-red-700">${t.totalDue.toLocaleString("bn-BD")} ৳</span></div></div>`};
const renderMobileFeeSection=e=>{const{totalDue:t}=calculateAllDuesForStudent(e);return`<div class="p-4 bg-white border-t-2 border-dashed border-indigo-200"><h4 class="text-base font-bold text-gray-700 mb-2">ফি জমা দিন</h4><div class="flex items-end space-x-2"><div class="flex-grow"><label for="fee_input_mobile_${e.id}" class="sr-only">টাকার পরিমাণ</label><input id="fee_input_mobile_${e.id}" type="number" placeholder="৳ ${t>0?t.toLocaleString("bn-BD"):"0"}" min="0" class="w-full p-2 border-2 border-indigo-300 rounded-lg text-base text-center font-bold focus:ring-indigo-500 transition"></div><button onclick="event.stopPropagation(); window.allocateFee('${e.id}', 'mobile')" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-5 rounded-lg shadow transition-transform transform hover:scale-105 flex-shrink-0">জমা দিন</button></div><p class="text-xs text-gray-500 mt-2">যেকোনো পরিমাণ টাকা দিলে সিস্টেম স্বয়ংক্রিয়ভাবে বকেয়া পরিশোধ করবে।</p></div>`};
const renderStudentCard=e=>{const{currentFeeType:t,currentSubFeeKey:a,feeConfig:o,expandedStudentId:n,selectedStudentId:r}=window.state,s=o.classNames[e.classId],{totalDue:i}=calculateCurrentFeeTypeDue(e),l=n===e.id,d=r===e.id,c=o.names[t]+(a&&o.subFees[t]?` (${o.subFees[t].keys[a]})`:""),u=renderAllDuesSummaryHTML(e),p=renderMobileFeeSection(e);return`<div class="student-card bg-white rounded-xl shadow-md mb-2 overflow-hidden border-2 ${d?"border-indigo-500 shadow-lg":"border-transparent"}"><div class="student-row flex items-center p-3 sm:p-4" onclick="window.handleStudentClick('${e.id}')"><div class="w-5/12 sm:w-4/12 flex items-center space-x-3"><div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">${e.name.charAt(0)}</div><div><p class="font-bold text-gray-800 text-sm leading-tight">${e.name}</p><p class="text-xs text-gray-500">ID: ${e.id}</p></div></div><div class="w-3/12 text-center hidden sm:block"><p class="text-sm font-semibold text-gray-600">${s}</p></div><div class="w-7/12 sm:w-5/12 flex items-center justify-end space-x-1 pr-1"><div class="text-right">${i>0?`<p class="font-extrabold text-red-600 text-lg">${i.toLocaleString("bn-BD")} ৳</p><p class="text-xs text-red-500 -mt-1">${c}</p>`:`<p class="font-bold text-green-600 text-base">পরিশোধিত</p><p class="text-xs text-gray-500 -mt-1">${c}</p>`}</div><button title="Print Due Slip" onclick="event.stopPropagation(); window.generateIndividualDueReport('${e.id}')" class="text-gray-400 hover:text-indigo-600 p-2 rounded-full transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg></button><div class="pl-1 lg:hidden"><svg class="w-4 h-4 text-gray-400 transform transition-transform duration-300 ${l?"rotate-180":""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></div></div></div><div class="expanded-content lg:hidden ${l?"active":""}"><div>${u}${p}</div></div></div>`};
const renderPrintReportModal=()=>{const e=window.state.reportSlipsData;if(!e||0===e.length)return renderStandardModal("রিপোর্ট","<p>কোনো বকেয়া পাওয়া যায়নি।</p>",`<button onclick="window.closeModal()" class="bg-indigo-600 text-white font-bold py-2 px-4 rounded">বন্ধ করুন</button>`);const t=e.map(e=>` <div class="print-slip bg-white p-6 rounded-lg border border-gray-300 shadow-lg mb-6 text-gray-800"> <div class="text-center border-b pb-3 mb-4"> <h3 class="text-xl font-bold text-indigo-800">${MADRASA_INFO.name}</h3> <p class="text-sm">${MADRASA_INFO.address}</p> <p class="text-sm font-semibold">${MADRASA_INFO.contact}</p> <h4 class="text-lg font-semibold text-gray-700 mt-2">বকেয়া ফি রশিদ</h4> <p class="text-xs text-gray-500">তৈরির তারিখ: ${new Date().toLocaleDateString("bn-BD")}</p> </div> <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-4"> <p><strong>নাম:</strong> ${e.studentDetails.name}</p> <p><strong>শ্রেণী:</strong> ${e.studentDetails.class}</p> <p><strong>আইডি:</strong> ${e.studentDetails.id}</p> </div> <table class="w-full text-sm text-left"> <thead class="bg-gray-100"> <tr> <th class="p-2 font-bold">ফি'র বিবরণ</th> <th class="p-2 font-bold">সময়কাল/খাত</th> <th class="p-2 font-bold text-right">টাকা</th> </tr> </thead> <tbody> ${e.dueItems.map(e=>` <tr class="border-b"> <td class="p-2">${e.feeName}</td> <td class="p-2">${e.description}</td> <td class="p-2 text-right">${e.amount.toLocaleString("bn-BD")}</td> </tr> `).join("")} </tbody> <tfoot class="font-bold"> <tr> <td colspan="2" class="p-2 text-right">সর্বমোট বকেয়া:</td> <td class="p-2 text-right text-lg text-red-600">${e.totalDue.toLocaleString("bn-BD")} ৳</td> </tr> </tfoot> </table> <div class="text-xs text-gray-500 mt-4 text-center"> এটি একটি কম্পিউটার-জেনারেটেড স্লিপ। </div> </div> `).join(""),a=`<div id="print-area" class="max-h-[70vh] overflow-y-auto p-2 bg-gray-50">${t}</div>`,o=`<button onclick="window.print()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg flex items-center transition-transform transform hover:scale-105"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 mr-2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>প্রিন্ট করুন</button>`;return renderStandardModal("বকেয়া ফি স্লিপ",a,o,"max-w-3xl")};
const renderDashboard=()=>{const{feeConfig:e,currentClass:t}=window.state,a=Object.keys(e.classNames).map(a=>`<button onclick="window.changeClass('${a}')" class="class-btn py-2 px-4 rounded-full text-xs font-bold transition-all duration-300 flex-shrink-0 whitespace-nowrap shadow-sm ${a===t?"bg-indigo-600 text-white shadow-lg transform scale-105":"bg-white text-gray-700 border hover:bg-indigo-50 hover:border-indigo-300"}">${e.classNames[a]}</button>`).join(""),o=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-gray-400"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;return`<div class="p-3 content-area max-w-7xl mx-auto">${renderTeacherSummary()}<div class="mb-5 bg-white p-3 rounded-xl shadow-md"><h3 class="text-sm font-semibold text-gray-700 mb-2">📚 ক্লাস নির্বাচন</h3><div class="slide-nav class-buttons-container flex space-x-2 overflow-x-scroll pb-1">${a}</div></div><div class="grid grid-cols-1 md:grid-cols-3 md:gap-4 mb-5"><div class="md:col-span-2 mb-3 md:mb-0">${renderFeeTypeSelector()}</div><div>${renderSubFeeSelector()}</div></div><div class="flex flex-col md:flex-row justify-between items-center mb-4 p-3 rounded-xl bg-indigo-50 border border-indigo-200 shadow-inner space-y-3 md:space-y-0"><div class="flex flex-wrap items-center gap-2"><h3 class="text-base font-bold text-indigo-700 whitespace-nowrap">বকেয়া দেখুন:</h3>${renderDatePicker(window.state.currentDate)} <button onclick="generateClassDueReport()" class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center space-x-2 transition-transform transform hover:scale-105"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M15.5 2H8.6c-.4 0-.8.2-1.1.5-.3.3-.5.7-.5 1.1V21c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h7.8c.4 0 .8-.2 1.1-.5.3-.3.5-.7.5-1.1V6.5L15.5 2z"/><path d="M14 2v4h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg><span>ক্লাস ডিউ রিপোর্ট</span></button></div><div class="relative w-full md:w-64"><input type="text" placeholder="শিক্ষার্থী খুঁজুন (নাম/আইডি)" oninput="filterStudents(this.value)" class="w-full p-2 pl-9 border border-indigo-300 rounded-lg shadow-inner focus:outline-none focus:ring-1 focus:ring-indigo-500 transition text-sm"><div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">${o}</div></div></div>${renderFeeCollection()}<div class="text-center text-xs text-gray-500 mt-4 p-1 bg-gray-200/50 rounded-lg">ডেটা এখন সার্ভারে সংরক্ষিত আছে।</div></div>`};
const renderFeeCollection=()=>{const{students:e,currentClass:t,feeConfig:a}=window.state,o=a.classNames[t];if(!e||0===e.length)return`<div class="p-6 text-center text-gray-500 bg-white rounded-xl shadow-lg mt-4 text-sm">ক্লাস ${o} এ কোনো শিক্ষার্থী নেই।</div>`;const n=e.map(e=>renderStudentCard(e)).join("");return`<div class="mt-4 grid grid-cols-1 lg:grid-cols-2 lg:gap-6 lg:items-start"><div class="space-y-2">${n}</div><div class="hidden lg:block">${renderStudentDetailsPanel()}</div></div>`};
const renderApp=()=>{const e=document.getElementById("app-container");e.querySelector("#loading-screen")&&e.querySelector("#loading-screen").remove(),e.innerHTML=`<main class="flex-grow pb-4">${renderDashboard()}</main>`;const t=document.getElementById("modal-container");window.state.modalOpen?(t.innerHTML=renderModalContent(),t.classList.remove("hidden")):(t.innerHTML="",t.classList.add("hidden"))};
window.filterStudents=e=>{const t=e.toLowerCase().trim(),{allStudentsData:a,currentClass:o}=window.state;window.state.students=a.filter(e=>e.classId===o&&(e.name.toLowerCase().includes(t)||e.id.includes(t))).sort((e,t)=>parseInt(e.id)-parseInt(t.id)),window.state.selectedStudentId=null,renderApp()};
const getMonthName=(e,t)=>`${window.months[t-1]} ${e.toLocaleString("bn-BD")}`;
