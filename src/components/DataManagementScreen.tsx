import React, { useState } from 'react';
import { ScreenType, RecentUpload, Employee } from '../types';
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
  Briefcase, 
  Search, 
  Trash2, 
  Edit3, 
  UserCheck,
  Plus
} from 'lucide-react';

interface DataManagementScreenProps {
  onNavigate: (screen: ScreenType) => void;
  uploads: RecentUpload[];
  onAddUpload: (filename: string) => void;
  employees: Employee[];
  onAddEmployee: (employee: Omit<Employee, 'id'>) => void;
  onDeleteEmployee: (id: string) => void;
  onUpdateEmployee: (employee: Employee) => void;
}

export const DataManagementScreen: React.FC<DataManagementScreenProps> = ({
  onNavigate,
  uploads,
  onAddUpload,
  employees,
  onAddEmployee,
  onDeleteEmployee,
  onUpdateEmployee
}) => {
  const [activeUploadModal, setActiveUploadModal] = useState<'inventory' | 'customer' | 'employee' | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);

  // Add / Edit Employee Modal State
  const [showEmployeeModal, setShowEmployeeModal] = useState<boolean>(false);
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [empName, setEmpName] = useState<string>('');
  const [empEmail, setEmpEmail] = useState<string>('');
  const [empPhone, setEmpPhone] = useState<string>('');
  const [empRole, setEmpRole] = useState<string>('Inventory Specialist');
  const [empDept, setEmpDept] = useState<string>('Logistics');

  // Employee search state
  const [employeeSearch, setEmployeeSearch] = useState<string>('');

  const handleSimulateUpload = (type: 'inventory' | 'customer' | 'employee', fileName?: string) => {
    setIsUploading(true);
    setTimeout(() => {
      let defaultName = 'dataset_import.csv';
      if (type === 'inventory') defaultName = 'inventory_q4_import.csv';
      if (type === 'customer') defaultName = 'client_roster_updated.xlsx';
      if (type === 'employee') defaultName = 'staff_employee_roster_2024.csv';

      const actualName = fileName || defaultName;
      onAddUpload(actualName);
      setIsUploading(false);
      setActiveUploadModal(null);
      setUploadSuccessMsg(`Successfully processed and synced ${type} dataset: ${actualName}`);
      setTimeout(() => setUploadSuccessMsg(null), 4000);
    }, 1200);
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

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    emp.email.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    emp.phone.includes(employeeSearch) ||
    emp.role.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  return (
    <div className="flex-1 px-4 py-6 w-full max-w-3xl mx-auto pb-44 animate-fade-in flex flex-col gap-6">
      {/* Intro Header */}
      <div>
        <p className="text-sm text-[#414844] leading-relaxed font-medium">
          Manage your nursery's core datasets. Keep inventory, customer records, and employee contact lists up to date for smooth operational workflows.
        </p>
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
                Oct 24, 2023
              </span>
            </div>
          </div>

          <button
            onClick={() => setActiveUploadModal('inventory')}
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

            <div className="relative z-10">
              <span className="block text-[10px] font-bold text-[#414844] uppercase tracking-wider">
                LAST UPLOAD
              </span>
              <span className="block text-sm font-bold text-[#1a1c1a] mt-0.5">
                Oct 22, 2023
              </span>
            </div>
          </div>

          <button
            onClick={() => setActiveUploadModal('customer')}
            className="relative z-10 w-full bg-white hover:bg-[#e7e9e5] border border-[#0e6c4a] active:scale-[0.99] text-[#19724f] font-bold py-2.5 px-3 rounded-xl text-xs transition-all flex justify-center items-center gap-1.5 cursor-pointer mt-1"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Data</span>
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
              onClick={() => setActiveUploadModal('employee')}
              className="bg-white hover:bg-[#e7e9e5] border border-[#c1c8c2] p-2.5 rounded-xl text-xs text-[#012d1d] transition-all"
              title="Import CSV"
            >
              <UploadCloud className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#c1c8c2] shadow-xl flex flex-col gap-4 animate-fade-in">
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
              Select or drop a .CSV or .XLSX file containing {activeUploadModal} records formatted to the Nursery Manager import standard.
            </p>

            {/* Drag and Drop Zone */}
            <div
              onClick={() => handleSimulateUpload(activeUploadModal)}
              className="border-2 border-dashed border-[#0e6c4a]/50 bg-[#f9faf6] hover:bg-[#a0f4c8]/20 p-8 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors"
            >
              <UploadCloud className="w-10 h-10 text-[#0e6c4a] mb-2" />
              <span className="font-semibold text-sm text-[#012d1d]">
                Click to browse or drop file here
              </span>
              <span className="text-xs text-[#717973] mt-1">
                Supports CSV, XLSX up to 25MB
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setActiveUploadModal(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-[#414844] hover:bg-[#f3f4f0]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSimulateUpload(activeUploadModal)}
                disabled={isUploading}
                className="bg-[#461702] hover:bg-[#622c13] text-white px-5 py-2 rounded-lg text-xs font-bold transition-all"
              >
                {isUploading ? 'Processing File...' : 'Upload & Sync'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
