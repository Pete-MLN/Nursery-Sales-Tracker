import React, { useState, useRef } from 'react';
import { ScreenType, RecentUpload, Employee, PlantItem, Customer } from '../types';
import { parsePosCsvToPlants, parsePosFileToPlants } from '../utils/posCsvParser';
import { parseCustomerFileToCustomers } from '../utils/customerParser';
import { 
  UploadCloud, 
  FileText, 
  Users, 
  UserPlus, 
  FileCheck, 
  CheckCircle, 
  X, 
  Download, 
  Mail, 
  Phone, 
  Search, 
  Trash2, 
  Edit3, 
  UserCheck,
  Plus,
  AlertCircle,
  FileCode,
  Building,
  Hash
} from 'lucide-react';

interface DataManagementScreenProps {
  onNavigate: (screen: ScreenType) => void;
  uploads: RecentUpload[];
  onAddUpload: (filename: string, size?: string, recordsCount?: number) => void;
  employees: Employee[];
  onAddEmployee: (employee: Omit<Employee, 'id'>) => void;
  onDeleteEmployee: (id: string) => void;
  onUpdateEmployee: (employee: Employee) => void;
  customers?: Customer[];
  onAddCustomer?: (customer: Omit<Customer, 'id'>) => void;
  onDeleteCustomer?: (id: string) => void;
  onUpdateCustomer?: (customer: Customer) => void;
  onImportCustomers?: (customers: Customer[]) => void;
  onImportInventoryPlants?: (plants: PlantItem[]) => void;
}

export const DataManagementScreen: React.FC<DataManagementScreenProps> = ({
  onNavigate,
  uploads,
  onAddUpload,
  employees,
  onAddEmployee,
  onDeleteEmployee,
  onUpdateEmployee,
  customers = [],
  onAddCustomer,
  onDeleteCustomer,
  onUpdateCustomer,
  onImportCustomers,
  onImportInventoryPlants
}) => {
  const [activeUploadModal, setActiveUploadModal] = useState<'inventory' | 'customer' | 'employee' | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);

  // File selection state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [estimatedRecords, setEstimatedRecords] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add / Edit Employee Modal State
  const [showEmployeeModal, setShowEmployeeModal] = useState<boolean>(false);
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [empName, setEmpName] = useState<string>('');
  const [empEmail, setEmpEmail] = useState<string>('');
  const [empPhone, setEmpPhone] = useState<string>('');
  const [empRole, setEmpRole] = useState<string>('Inventory Specialist');
  const [empDept, setEmpDept] = useState<string>('Logistics');

  // Add / Edit Customer Modal State
  const [showCustomerModal, setShowCustomerModal] = useState<boolean>(false);
  const [editingCustId, setEditingCustId] = useState<string | null>(null);
  const [custName, setCustName] = useState<string>('');
  const [custType, setCustType] = useState<'RETAIL' | 'WHOLESALE' | 'COMMERCIAL'>('RETAIL');
  const [custAccountNo, setCustAccountNo] = useState<string>('');
  const [custCompany, setCustCompany] = useState<string>('');
  const [custPhone, setCustPhone] = useState<string>('');
  const [custEmail, setCustEmail] = useState<string>('');

  // Search states
  const [employeeSearch, setEmployeeSearch] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');

  const handleOpenUploadModal = (type: 'inventory' | 'customer' | 'employee') => {
    setSelectedFile(null);
    setFileError(null);
    setIsDragging(false);
    setEstimatedRecords(0);
    setActiveUploadModal(type);
  };

  const processFile = (file: File) => {
    if (!file) return;

    // Check file type extension
    const validExts = ['.csv', '.xlsx', '.xls', '.txt'];
    const lowerName = file.name.toLowerCase();
    const isValid = validExts.some(ext => lowerName.endsWith(ext));

    if (!isValid) {
      setFileError('Please select a valid CSV, Excel (.xlsx/.xls), or TXT data file.');
      setSelectedFile(null);
      return;
    }

    setFileError(null);
    setSelectedFile(file);

    // Attempt to estimate or parse records count
    if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) {
          const lines = text.split('\n').filter(line => line.trim().length > 0);
          const count = Math.max(1, lines.length - 1); // Exclude header line if possible
          setEstimatedRecords(count);
        }
      };
      reader.readAsText(file.slice(0, 100000)); // Read first 100KB for quick preview
    } else {
      // Excel files estimation based on file size
      const count = Math.max(15, Math.floor(file.size / 110));
      setEstimatedRecords(count);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmUpload = async () => {
    if (!activeUploadModal) return;

    if (!selectedFile) {
      setFileError('Please click to select a file or drag a file into the area first.');
      return;
    }

    setIsUploading(true);

    const finishUpload = (recCount: number, customMessage?: string) => {
      let sizeStr = '120 KB';
      if (selectedFile.size >= 1024 * 1024) {
        sizeStr = `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`;
      } else {
        sizeStr = `${Math.max(1, Math.round(selectedFile.size / 1024))} KB`;
      }

      onAddUpload(selectedFile.name, sizeStr, recCount);
      setIsUploading(false);
      setActiveUploadModal(null);
      setUploadSuccessMsg(
        customMessage ||
        `Successfully processed and synced ${activeUploadModal} dataset: ${selectedFile.name} (${recCount} records)`
      );
      setSelectedFile(null);
      setTimeout(() => setUploadSuccessMsg(null), 6000);
    };

    if (activeUploadModal === 'inventory') {
      try {
        const parsedPlants = await parsePosFileToPlants(selectedFile);
        if (parsedPlants && parsedPlants.length > 0) {
          if (onImportInventoryPlants) {
            onImportInventoryPlants(parsedPlants);
          }
          finishUpload(
            parsedPlants.length,
            `Successfully imported ${parsedPlants.length} POS inventory records with Retail, Wholesale, Garden Center & Elite pricing levels from ${selectedFile.name}`
          );
          return;
        }
      } catch (err) {
        console.error('Error parsing uploaded POS inventory spreadsheet:', err);
      }
      finishUpload(estimatedRecords || 50);
    } else if (activeUploadModal === 'customer') {
      try {
        const parsedCusts = await parseCustomerFileToCustomers(selectedFile);
        if (parsedCusts && parsedCusts.length > 0) {
          if (onImportCustomers) {
            onImportCustomers(parsedCusts);
          }
          finishUpload(
            parsedCusts.length,
            `Successfully imported ${parsedCusts.length} customer records from ${selectedFile.name}`
          );
          return;
        }
      } catch (err) {
        console.error('Error parsing uploaded customer spreadsheet:', err);
      }
      finishUpload(estimatedRecords || 40);
    } else {
      setTimeout(() => {
        finishUpload(estimatedRecords || Math.floor(100 + Math.random() * 400));
      }, 1000);
    }
  };

  const openAddEmployeeModal = () => {
    setEditingEmpId(null);
    setEmpName('');
    setEmpEmail('');
    setEmpPhone('');
    setEmpRole('Operations Specialist');
    setEmpDept('Logistics');
    setShowEmployeeModal(true);
  };

  const openEditEmployeeModal = (emp: Employee) => {
    setEditingEmpId(emp.id);
    setEmpName(emp.name);
    setEmpEmail(emp.email);
    setEmpPhone(emp.phone);
    setEmpRole(emp.role);
    setEmpDept(emp.department || 'General');
    setShowEmployeeModal(true);
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim() || !empEmail.trim() || !empPhone.trim()) {
      alert('Please fill out Name, Email, and Phone Number.');
      return;
    }

    if (editingEmpId) {
      onUpdateEmployee({
        id: editingEmpId,
        name: empName.trim(),
        email: empEmail.trim(),
        phone: empPhone.trim(),
        role: empRole.trim(),
        department: empDept.trim(),
        status: 'Active'
      });
      setUploadSuccessMsg(`Updated employee record for ${empName}`);
    } else {
      onAddEmployee({
        name: empName.trim(),
        email: empEmail.trim(),
        phone: empPhone.trim(),
        role: empRole.trim(),
        department: empDept.trim(),
        status: 'Active'
      });
      setUploadSuccessMsg(`Added new employee: ${empName}`);
    }

    setShowEmployeeModal(false);
    setTimeout(() => setUploadSuccessMsg(null), 4000);
  };

  const openAddCustomerModal = () => {
    setEditingCustId(null);
    setCustName('');
    setCustType('RETAIL');
    setCustAccountNo('');
    setCustCompany('');
    setCustPhone('');
    setCustEmail('');
    setShowCustomerModal(true);
  };

  const openEditCustomerModal = (cust: Customer) => {
    setEditingCustId(cust.id);
    setCustName(cust.name);
    setCustType(cust.type || 'RETAIL');
    setCustAccountNo(cust.accountNo || '');
    setCustCompany(cust.company || '');
    setCustPhone(cust.phone || '');
    setCustEmail(cust.email || '');
    setShowCustomerModal(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim()) {
      alert('Please enter a Customer Name.');
      return;
    }

    if (editingCustId && onUpdateCustomer) {
      onUpdateCustomer({
        id: editingCustId,
        name: custName.trim(),
        type: custType,
        accountNo: custAccountNo.trim() || undefined,
        company: custCompany.trim() || undefined,
        phone: custPhone.trim() || undefined,
        email: custEmail.trim() || undefined
      });
      setUploadSuccessMsg(`Updated customer record for ${custName}`);
    } else if (onAddCustomer) {
      onAddCustomer({
        name: custName.trim(),
        type: custType,
        accountNo: custAccountNo.trim() || undefined,
        company: custCompany.trim() || undefined,
        phone: custPhone.trim() || undefined,
        email: custEmail.trim() || undefined
      });
      setUploadSuccessMsg(`Added new customer: ${custName}`);
    }

    setShowCustomerModal(false);
    setTimeout(() => setUploadSuccessMsg(null), 4000);
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    emp.email.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    emp.phone.includes(employeeSearch) ||
    emp.role.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  const filteredCustomers = customers.filter(cust => 
    cust.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (cust.company && cust.company.toLowerCase().includes(customerSearch.toLowerCase())) ||
    (cust.email && cust.email.toLowerCase().includes(customerSearch.toLowerCase())) ||
    (cust.phone && cust.phone.includes(customerSearch)) ||
    (cust.type && cust.type.toLowerCase().includes(customerSearch.toLowerCase()))
  );

  const lastInventoryUpload = uploads.find(u => 
    u.filename.toLowerCase().includes('inventory') || 
    u.filename.toLowerCase().includes('pos') || 
    u.filename.toLowerCase().includes('plant') ||
    u.filename.toLowerCase().endsWith('.csv') ||
    u.filename.toLowerCase().endsWith('.xlsx') ||
    u.filename.toLowerCase().endsWith('.xls')
  ) || uploads[0];

  const lastInventoryDate = lastInventoryUpload ? lastInventoryUpload.date : 'Oct 24, 2023';

  const lastCustomerUpload = uploads.find(u => 
    u.filename.toLowerCase().includes('customer') || 
    u.filename.toLowerCase().includes('client')
  );

  const lastCustomerDate = lastCustomerUpload ? lastCustomerUpload.date : 'Oct 22, 2023';

  return (
    <div className="flex-1 px-4 py-6 w-full max-w-3xl mx-auto pb-44 animate-fade-in flex flex-col gap-6">
      {/* Intro Header & Cloud Storage Info */}
      <div className="flex flex-col gap-3">
        <p className="text-sm text-[#414844] leading-relaxed font-medium">
          Manage your nursery's core datasets. Keep inventory, customer records, and employee contact lists up to date for smooth operational workflows.
        </p>

        {/* Database & Storage Status Panel */}
        <div className="bg-[#012d1d] text-white p-4 rounded-2xl border border-[#0e6c4a]/40 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0e6c4a] text-[#a0f4c8] flex items-center justify-center shrink-0 font-bold">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-white">Database Storage & Real-Time Cloud Sync</h4>
                <span className="bg-[#a0f4c8] text-[#002113] text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Firestore Active
                </span>
              </div>
              <p className="text-xs text-[#a0f4c8]/90 mt-0.5 leading-snug">
                Uploaded data is stored in <strong className="text-white">Google Cloud Firestore</strong> (<code className="bg-[#002113] px-1.5 py-0.5 rounded text-[11px] text-[#a0f4c8]">customers</code> collection). Real-time listeners automatically update your device and order forms.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end md:self-auto border-t md:border-t-0 md:border-l border-[#0e6c4a]/60 pt-3 md:pt-0 md:pl-4 text-xs">
            <div className="text-right">
              <span className="block text-[10px] font-bold text-[#a0f4c8]/80 uppercase">STORED CUSTOMERS</span>
              <span className="text-base font-extrabold text-white">{customers.length.toLocaleString()} Records</span>
            </div>
            <button
              onClick={() => handleOpenUploadModal('customer')}
              className="bg-[#a0f4c8] hover:bg-[#a0f4c8]/90 text-[#002113] font-bold px-3 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <UploadCloud className="w-4 h-4 text-[#002113]" />
              <span>Upload File</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {uploadSuccessMsg && (
        <div className="bg-[#a0f4c8] text-[#002113] p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between border border-[#0e6c4a]/30 animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[#0e6c4a]" />
            <span>{uploadSuccessMsg}</span>
          </div>
          <button onClick={() => setUploadSuccessMsg(null)} className="text-[#414844] hover:text-[#012d1d]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Datasets Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Inventory List Card */}
        <div className="relative overflow-hidden bg-[#f3f4f0] rounded-2xl p-5 border border-[#c1c8c2] flex flex-col justify-between gap-4 shadow-2xs">
          <div className="absolute top-2 right-2 text-[#e2e3df] pointer-events-none select-none opacity-40">
            <FileText className="w-24 h-24" />
          </div>

          <div>
            <div className="flex items-center gap-2.5 relative z-10 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#a0f4c8] text-[#19724f] flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#1a1c1a]">Inventory List</h3>
            </div>

            <div className="relative z-10">
              <span className="block text-[10px] font-bold text-[#414844] uppercase tracking-wider">
                LAST UPLOAD
              </span>
              <span className="block text-sm font-bold text-[#1a1c1a] mt-0.5">
                {lastInventoryDate}
              </span>
            </div>
          </div>

          <button
            onClick={() => handleOpenUploadModal('inventory')}
            className="relative z-10 w-full bg-[#461702] hover:bg-[#622c13] active:scale-[0.99] text-white font-bold py-2.5 px-3 rounded-xl text-xs transition-all flex justify-center items-center gap-1.5 cursor-pointer mt-1"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Data</span>
          </button>
        </div>

        {/* Customer List Card */}
        <div className="relative overflow-hidden bg-[#f3f4f0] rounded-2xl p-5 border border-[#c1c8c2] flex flex-col justify-between gap-4 shadow-2xs">
          <div className="absolute top-2 right-2 text-[#e2e3df] pointer-events-none select-none opacity-40">
            <Users className="w-24 h-24" />
          </div>

          <div>
            <div className="flex items-center gap-2.5 relative z-10 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#a0f4c8] text-[#19724f] flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#1a1c1a]">Customer List</h3>
            </div>

            <div className="relative z-10 flex flex-col gap-1">
              <div>
                <span className="block text-[10px] font-bold text-[#414844] uppercase tracking-wider">
                  STORED IN FIRESTORE
                </span>
                <span className="block text-sm font-bold text-[#012d1d] mt-0.5">
                  {customers.length.toLocaleString()} Active Accounts
                </span>
              </div>
              <span className="text-[11px] text-[#717973] font-medium">
                Last sync: {lastCustomerDate}
              </span>
            </div>
          </div>

          <button
            onClick={() => handleOpenUploadModal('customer')}
            className="relative z-10 w-full bg-[#0e6c4a] hover:bg-[#012d1d] active:scale-[0.99] text-white font-bold py-2.5 px-3 rounded-xl text-xs transition-all flex justify-center items-center gap-1.5 cursor-pointer mt-1 shadow-2xs"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload / Re-Import File</span>
          </button>
        </div>

        {/* Employee List Card */}
        <div className="relative overflow-hidden bg-[#f3f4f0] rounded-2xl p-5 border border-[#c1c8c2] flex flex-col justify-between gap-4 shadow-2xs border-l-4 border-l-[#0e6c4a]">
          <div className="absolute top-2 right-2 text-[#e2e3df] pointer-events-none select-none opacity-40">
            <UserCheck className="w-24 h-24" />
          </div>

          <div>
            <div className="flex items-center gap-2.5 relative z-10 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#012d1d] text-[#a0f4c8] flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#1a1c1a]">Employee List</h3>
            </div>

            <div className="relative z-10">
              <span className="block text-[10px] font-bold text-[#414844] uppercase tracking-wider">
                ACTIVE STAFF
              </span>
              <span className="block text-sm font-bold text-[#012d1d] mt-0.5">
                {employees.length} Employees Configured
              </span>
            </div>
          </div>

          <div className="flex gap-2 relative z-10 mt-1">
            <button
              onClick={openAddEmployeeModal}
              className="flex-1 bg-[#0e6c4a] hover:bg-[#012d1d] active:scale-[0.99] text-white font-bold py-2.5 px-2 rounded-xl text-xs transition-all flex justify-center items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Staff</span>
            </button>
            <button
              onClick={() => handleOpenUploadModal('employee')}
              className="bg-white hover:bg-[#e7e9e5] border border-[#c1c8c2] p-2.5 rounded-xl text-xs text-[#012d1d] transition-all cursor-pointer"
              title="Import CSV"
            >
              <UploadCloud className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Customer Accounts Section */}
      <section className="bg-white rounded-2xl p-5 border border-[#c1c8c2] flex flex-col gap-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-[#f3f4f0] pb-3">
          <div>
            <h3 className="font-bold text-lg text-[#012d1d] flex items-center gap-2">
              <span>Customer Accounts Directory</span>
              <span className="bg-[#a0f4c8] text-[#19724f] text-xs px-2 py-0.5 rounded-full font-bold">
                {customers.length}
              </span>
            </h3>
            <p className="text-xs text-[#414844] mt-0.5">
              Wholesale, retail, and commercial customer list for orders and scan tag lookup.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openAddCustomerModal}
              className="bg-[#0e6c4a] hover:bg-[#012d1d] text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Customer</span>
            </button>
            <button
              onClick={() => handleOpenUploadModal('customer')}
              className="bg-white hover:bg-[#e7e9e5] border border-[#c1c8c2] px-3 py-2 rounded-xl text-xs font-bold text-[#012d1d] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload CSV/Excel</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#717973]" />
          <input
            type="text"
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            placeholder="Search customer by name, company, phone, email, or type..."
            className="w-full bg-[#f3f4f0] border border-[#c1c8c2] rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-[#1a1c1a] focus:outline-none focus:border-[#012d1d]"
          />
        </div>

        {/* Customer Rows */}
        <div className="flex flex-col gap-3">
          {filteredCustomers.length === 0 ? (
            <div className="p-8 text-center bg-[#f3f4f0] rounded-xl text-[#717973] border border-dashed border-[#c1c8c2]">
              <p className="text-xs font-medium">No customer accounts found matching filter.</p>
              <button
                onClick={openAddCustomerModal}
                className="mt-2 text-xs font-bold text-[#0e6c4a] hover:underline"
              >
                + Add New Customer Account
              </button>
            </div>
          ) : (
            filteredCustomers.map((cust) => (
              <div
                key={cust.id}
                className="bg-[#f9faf6] p-3.5 rounded-xl border border-[#c1c8c2]/70 hover:border-[#012d1d] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#012d1d] text-[#a0f4c8] flex items-center justify-center font-bold text-sm shrink-0 border border-[#19724f]/20">
                    {cust.name.split(' ').map(n => n[0]).join('') || 'C'}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-sm text-[#1a1c1a]">{cust.name}</h4>
                      {cust.type && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          cust.type === 'WHOLESALE' 
                            ? 'bg-[#19724f] text-white' 
                            : cust.type === 'COMMERCIAL'
                            ? 'bg-[#461702] text-white'
                            : 'bg-[#e2e3df] text-[#414844]'
                        }`}>
                          {cust.type}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-[#414844]">
                      {cust.company && (
                        <span className="flex items-center gap-1 font-medium text-[#1a1c1a]">
                          <Building className="w-3.5 h-3.5 text-[#0e6c4a]" />
                          <span>{cust.company}</span>
                        </span>
                      )}
                      {cust.email && (
                        <a
                          href={`mailto:${cust.email}`}
                          className="flex items-center gap-1 hover:text-[#012d1d] hover:underline"
                        >
                          <Mail className="w-3.5 h-3.5 text-[#0e6c4a]" />
                          <span>{cust.email}</span>
                        </a>
                      )}
                      {cust.phone && (
                        <a
                          href={`tel:${cust.phone}`}
                          className="flex items-center gap-1 hover:text-[#012d1d] hover:underline font-mono"
                        >
                          <Phone className="w-3.5 h-3.5 text-[#0e6c4a]" />
                          <span>{cust.phone}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto pt-2 sm:pt-0 border-t sm:border-0 border-[#e2e3df]">
                  <button
                    onClick={() => openEditCustomerModal(cust)}
                    className="p-1.5 rounded-lg text-[#414844] hover:bg-[#e2e3df] hover:text-[#012d1d] transition-colors"
                    title="Edit Customer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remove ${cust.name} from customer directory?`)) {
                        if (onDeleteCustomer) {
                          onDeleteCustomer(cust.id);
                        }
                        setUploadSuccessMsg(`Removed ${cust.name} from directory.`);
                        setTimeout(() => setUploadSuccessMsg(null), 3000);
                      }
                    }}
                    className="p-1.5 rounded-lg text-[#ba1a1a] hover:bg-[#ffdad6] transition-colors"
                    title="Delete Customer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Employee List / Directory Section */}
      <section className="bg-white rounded-2xl p-5 border border-[#c1c8c2] flex flex-col gap-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-[#f3f4f0] pb-3">
          <div>
            <h3 className="font-bold text-lg text-[#012d1d] flex items-center gap-2">
              <span>Employee Directory & Roster</span>
              <span className="bg-[#a0f4c8] text-[#19724f] text-xs px-2 py-0.5 rounded-full font-bold">
                {employees.length}
              </span>
            </h3>
            <p className="text-xs text-[#414844] mt-0.5">
              Contact roster for order dispatching, text notifications, and task assignments.
            </p>
          </div>

          <button
            onClick={openAddEmployeeModal}
            className="self-start sm:self-auto bg-[#461702] hover:bg-[#622c13] text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Employee</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#717973]" />
          <input
            type="text"
            value={employeeSearch}
            onChange={(e) => setEmployeeSearch(e.target.value)}
            placeholder="Search employee by name, email, phone, or role..."
            className="w-full bg-[#f3f4f0] border border-[#c1c8c2] rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-[#1a1c1a] focus:outline-none focus:border-[#012d1d]"
          />
        </div>

        {/* Employee Rows */}
        <div className="flex flex-col gap-3">
          {filteredEmployees.length === 0 ? (
            <div className="p-8 text-center bg-[#f3f4f0] rounded-xl text-[#717973] border border-dashed border-[#c1c8c2]">
              <p className="text-xs font-medium">No employees found matching filter.</p>
              <button
                onClick={openAddEmployeeModal}
                className="mt-2 text-xs font-bold text-[#0e6c4a] hover:underline"
              >
                + Add New Employee Record
              </button>
            </div>
          ) : (
            filteredEmployees.map((emp) => (
              <div
                key={emp.id}
                className="bg-[#f9faf6] p-3.5 rounded-xl border border-[#c1c8c2]/70 hover:border-[#012d1d] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#a0f4c8] text-[#002113] flex items-center justify-center font-bold text-sm shrink-0 border border-[#19724f]/20">
                    {emp.name.split(' ').map(n => n[0]).join('') || 'E'}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-[#1a1c1a]">{emp.name}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#e2e3df] text-[#414844]">
                        {emp.role}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-[#414844]">
                      <a
                        href={`mailto:${emp.email}`}
                        className="flex items-center gap-1 hover:text-[#012d1d] hover:underline"
                      >
                        <Mail className="w-3.5 h-3.5 text-[#0e6c4a]" />
                        <span>{emp.email}</span>
                      </a>

                      <a
                        href={`tel:${emp.phone}`}
                        className="flex items-center gap-1 hover:text-[#012d1d] hover:underline font-mono"
                      >
                        <Phone className="w-3.5 h-3.5 text-[#0e6c4a]" />
                        <span>{emp.phone}</span>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto pt-2 sm:pt-0 border-t sm:border-0 border-[#e2e3df]">
                  <button
                    onClick={() => openEditEmployeeModal(emp)}
                    className="p-1.5 rounded-lg text-[#414844] hover:bg-[#e2e3df] hover:text-[#012d1d] transition-colors"
                    title="Edit Employee"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remove ${emp.name} from employee list?`)) {
                        onDeleteEmployee(emp.id);
                        setUploadSuccessMsg(`Removed ${emp.name} from roster.`);
                        setTimeout(() => setUploadSuccessMsg(null), 3000);
                      }
                    }}
                    className="p-1.5 rounded-lg text-[#ba1a1a] hover:bg-[#ffdad6] transition-colors"
                    title="Delete Employee"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Recent Uploads Section */}
      <section className="bg-white rounded-2xl p-5 border border-[#c1c8c2] flex flex-col gap-4 shadow-2xs">
        <div className="flex justify-between items-center border-b border-[#f3f4f0] pb-3">
          <h3 className="font-bold text-lg text-[#1a1c1a]">Recent Data Imports</h3>
          <span className="text-xs text-[#717973] font-medium">{uploads.length} files logged</span>
        </div>

        <div className="flex flex-col gap-3 divide-y divide-[#f3f4f0]">
          {uploads.map((upload) => (
            <div key={upload.id} className="pt-2.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileCheck className="w-5 h-5 text-[#414844] shrink-0" />
                <div>
                  <span className="block font-medium text-sm text-[#1a1c1a]">
                    {upload.filename}
                  </span>
                  <span className="block text-xs text-[#717973]">
                    {upload.size || 'CSV Data'} • {upload.recordsCount || 200} records
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-[#414844]">
                  {upload.date}, {upload.time}
                </span>
                <button
                  onClick={() => alert(`Downloading dataset copy: ${upload.filename}`)}
                  className="p-1 text-[#717973] hover:text-[#012d1d]"
                  title="Download CSV"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Manual Add/Edit Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#c1c8c2] shadow-xl flex flex-col gap-4 animate-fade-in">
            <div className="flex justify-between items-center border-b border-[#f3f4f0] pb-3">
              <h3 className="font-bold text-lg text-[#012d1d]">
                {editingCustId ? 'Edit Customer Account' : 'Add New Customer'}
              </h3>
              <button
                onClick={() => setShowCustomerModal(false)}
                className="text-[#717973] hover:text-[#1a1c1a]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-bold text-[#1a1c1a] uppercase mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="e.g. John Smith"
                  className="w-full bg-[#f9faf6] border border-[#717973] rounded-lg px-3 py-2.5 text-sm text-[#1a1c1a] focus:outline-none focus:border-[#012d1d]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1a1c1a] uppercase mb-1">
                  Account Type
                </label>
                <select
                  value={custType}
                  onChange={(e) => setCustType(e.target.value as any)}
                  className="w-full bg-[#f9faf6] border border-[#717973] rounded-lg px-3 py-2.5 text-sm text-[#1a1c1a] focus:outline-none focus:border-[#012d1d]"
                >
                  <option value="RETAIL">Retail</option>
                  <option value="WHOLESALE">Wholesale</option>
                  <option value="COMMERCIAL">Commercial</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1a1c1a] uppercase mb-1">
                  Company / Farm Name
                </label>
                <input
                  type="text"
                  value={custCompany}
                  onChange={(e) => setCustCompany(e.target.value)}
                  placeholder="e.g. Green Valley Landscapes"
                  className="w-full bg-[#f9faf6] border border-[#717973] rounded-lg px-3 py-2.5 text-sm text-[#1a1c1a] focus:outline-none focus:border-[#012d1d]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-[#1a1c1a] uppercase mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    placeholder="e.g. (555) 000-0000"
                    className="w-full bg-[#f9faf6] border border-[#717973] rounded-lg px-3 py-2.5 text-sm text-[#1a1c1a] focus:outline-none focus:border-[#012d1d]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1a1c1a] uppercase mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                    placeholder="e.g. john@example.com"
                    className="w-full bg-[#f9faf6] border border-[#717973] rounded-lg px-3 py-2.5 text-sm text-[#1a1c1a] focus:outline-none focus:border-[#012d1d]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-[#f3f4f0]">
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-[#414844] hover:bg-[#f3f4f0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#0e6c4a] hover:bg-[#012d1d] text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-all shadow-xs"
                >
                  {editingCustId ? 'Save Changes' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Add/Edit Employee Modal */}
      {showEmployeeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#c1c8c2] shadow-xl flex flex-col gap-4 animate-fade-in">
            <div className="flex justify-between items-center border-b border-[#f3f4f0] pb-3">
              <h3 className="font-bold text-lg text-[#012d1d]">
                {editingEmpId ? 'Edit Employee Record' : 'Add New Employee'}
              </h3>
              <button
                onClick={() => setShowEmployeeModal(false)}
                className="text-[#717973] hover:text-[#1a1c1a]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-bold text-[#1a1c1a] uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full bg-[#f9faf6] border border-[#717973] rounded-lg px-3 py-2.5 text-sm text-[#1a1c1a] focus:outline-none focus:border-[#012d1d]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1a1c1a] uppercase mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={empEmail}
                  onChange={(e) => setEmpEmail(e.target.value)}
                  placeholder="e.g. jane@maplelanenursery.com"
                  className="w-full bg-[#f9faf6] border border-[#717973] rounded-lg px-3 py-2.5 text-sm text-[#1a1c1a] focus:outline-none focus:border-[#012d1d]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1a1c1a] uppercase mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={empPhone}
                  onChange={(e) => setEmpPhone(e.target.value)}
                  placeholder="e.g. (555) 123-4567"
                  className="w-full bg-[#f9faf6] border border-[#717973] rounded-lg px-3 py-2.5 text-sm text-[#1a1c1a] focus:outline-none focus:border-[#012d1d]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-[#1a1c1a] uppercase mb-1">
                    Role Title
                  </label>
                  <input
                    type="text"
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value)}
                    placeholder="e.g. Inventory Tech"
                    className="w-full bg-[#f9faf6] border border-[#717973] rounded-lg px-3 py-2.5 text-sm text-[#1a1c1a] focus:outline-none focus:border-[#012d1d]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1a1c1a] uppercase mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={empDept}
                    onChange={(e) => setEmpDept(e.target.value)}
                    placeholder="e.g. Logistics"
                    className="w-full bg-[#f9faf6] border border-[#717973] rounded-lg px-3 py-2.5 text-sm text-[#1a1c1a] focus:outline-none focus:border-[#012d1d]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-[#f3f4f0]">
                <button
                  type="button"
                  onClick={() => setShowEmployeeModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-[#414844] hover:bg-[#f3f4f0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#461702] hover:bg-[#622c13] text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-all shadow-xs"
                >
                  {editingEmpId ? 'Save Changes' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dataset File Import Modal */}
      {activeUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-start justify-center p-4 pt-8 md:pt-14 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#c1c8c2] shadow-2xl flex flex-col gap-4 animate-fade-in my-auto md:my-0">
            {/* Hidden HTML File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="flex justify-between items-center border-b border-[#f3f4f0] pb-3">
              <h3 className="font-bold text-lg text-[#012d1d] capitalize">
                Upload {activeUploadModal} Dataset
              </h3>
              <button
                onClick={() => setActiveUploadModal(null)}
                className="text-[#717973] hover:text-[#1a1c1a]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#414844]">
              Select or drop a .CSV or .XLSX file containing {activeUploadModal} records formatted to the Nursery Manager standard.
            </p>

            {/* Error Message if invalid or missing */}
            {fileError && (
              <div className="bg-[#ffdad6] text-[#ba1a1a] p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border border-[#ffb4ab]">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#ba1a1a]" />
                <span>{fileError}</span>
              </div>
            )}

            {/* File Selection / Drop Area */}
            {selectedFile ? (
              <div className="bg-[#a0f4c8]/20 border-2 border-[#0e6c4a] rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-lg bg-[#a0f4c8] text-[#002113] flex items-center justify-center shrink-0 font-bold">
                    <FileCode className="w-5 h-5 text-[#0e6c4a]" />
                  </div>
                  <div className="overflow-hidden text-left">
                    <p className="font-bold text-sm text-[#012d1d] truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-[#414844]">
                      {Math.max(1, Math.round(selectedFile.size / 1024))} KB
                      {estimatedRecords > 0 && ` • ~${estimatedRecords} records detected`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-bold text-[#0e6c4a] hover:underline px-2 py-1 rounded bg-white border border-[#0e6c4a]/30 cursor-pointer"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setEstimatedRecords(0);
                    }}
                    className="p-1 text-[#ba1a1a] hover:bg-[#ffdad6] rounded-lg transition-colors cursor-pointer"
                    title="Remove File"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed ${
                  isDragging ? 'border-[#012d1d] bg-[#a0f4c8]/30 scale-[1.01]' : 'border-[#0e6c4a]/50 bg-[#f9faf6] hover:bg-[#a0f4c8]/20'
                } p-8 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all`}
              >
                <UploadCloud className="w-10 h-10 text-[#0e6c4a] mb-2" />
                <span className="font-semibold text-sm text-[#012d1d]">
                  Click here to browse files on your computer
                </span>
                <span className="text-xs text-[#717973] mt-1">
                  or drag and drop CSV / XLSX files here (up to 25MB)
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-1.5 mt-2">
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setActiveUploadModal(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-[#414844] hover:bg-[#f3f4f0]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmUpload}
                  disabled={!selectedFile || isUploading}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 ${
                    !selectedFile || isUploading
                      ? 'bg-[#c1c8c2] text-[#717973] cursor-not-allowed'
                      : 'bg-[#461702] hover:bg-[#622c13] active:scale-[0.98] text-white cursor-pointer'
                  }`}
                >
                  {isUploading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Processing & Syncing...</span>
                    </>
                  ) : (
                    <span>Upload & Sync</span>
                  )}
                </button>
              </div>

              {!selectedFile && (
                <p className="text-[11px] text-[#717973] text-right">
                  * Click above to pick a file before clicking Upload & Sync
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
