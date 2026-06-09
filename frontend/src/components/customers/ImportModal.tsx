'use client';

import { useState, useRef, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '@/lib/api-client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Upload, FileText, ArrowRight, Check, AlertCircle, RefreshCw, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// Mock list for generating authentic names if names are missing in CSV
const FIRST_NAMES = {
  male: ['Aarav','Vivaan','Aditya','Vihaan','Arjun','Sai','Reyansh','Ayaan','Krishna','Ishaan','Rohan','Karan','Amit','Rahul','Vikram','Rajesh','Suresh','Anil','Sunil','Vijay','Deepak','Sanjay','Ramesh','Mahesh','Alok','Abhishek','Piyush','Gaurav'],
  female: ['Aadhya','Ananya','Diya','Pari','Kavya','Ishita','Aanya','Riya','Neha','Pooja','Priya','Shruti','Sneha','Meera','Anjali','Kiran','Divya','Ritu','Shweta','Kriti','Neeta','Sunita','Geeta','Lata','Rekha','Payal','Simran','Nisha'],
  other: ['Sam', 'Jordan', 'Taylor', 'Morgan', 'Robin', 'Casey', 'Jamie', 'Alex']
};
const LAST_NAMES = ['Sharma','Verma','Singh','Gupta','Patel','Kumar','Mehta','Joshi','Nair','Reddy','Shah','Agarwal','Tiwari','Pandey','Rao','Iyer','Pillai','Menon','Bose','Das','Choudhury','Dutta','Roy','Sen','Mukherjee','Banerjee'];
const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune', 'Hyderabad', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow'];

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'upload' | 'mapping' | 'preview' | 'progress' | 'success';

interface ColumnMapping {
  name: string;
  email: string;
  phone: string;
  city: string;
  gender: string;
  total_spend: string;
  order_count: string;
  visit_count: string;
}

export function ImportModal({ isOpen, onClose }: ImportModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [multiplier, setMultiplier] = useState<number>(1); // In case they have (k$) for income
  
  // Mapping configuration
  const [mapping, setMapping] = useState<ColumnMapping>({
    name: '',
    email: '',
    phone: '',
    city: '',
    gender: '',
    total_spend: '',
    order_count: '',
    visit_count: '',
  });

  // Secure CSV parser
  const parseCSV = (text: string): string[][] => {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentValue = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (inQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            currentValue += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          currentValue += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          row.push(currentValue.trim());
          currentValue = '';
        } else if (char === '\n' || char === '\r') {
          row.push(currentValue.trim());
          currentValue = '';
          if (row.length > 0 && (row.length > 1 || row[0] !== '')) {
            lines.push(row);
          }
          row = [];
          if (char === '\r' && nextChar === '\n') {
            i++;
          }
        } else {
          currentValue += char;
        }
      }
    }
    if (currentValue !== '' || row.length > 0) {
      row.push(currentValue.trim());
      lines.push(row);
    }
    return lines;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processFile(selectedFile);
  };

  // Pre-configured Mall Customers sample dataset to load instantly
  const loadSampleDataset = () => {
    const sampleCsv = `CustomerID,Genre,Age,Annual Income (k$),Spending Score (1-100)
0001,Male,19,15,39
0002,Male,21,15,81
0003,Female,20,16,6
0004,Female,23,16,77
0005,Female,31,17,40
0006,Female,22,17,76
0007,Female,35,18,6
0008,Female,23,18,94
0009,Male,64,19,3
0010,Female,30,19,72
0011,Male,67,19,14
0012,Female,35,19,99
0013,Female,58,20,15
0014,Female,24,20,77
0015,Male,37,20,13
0016,Male,22,20,79
0017,Female,35,21,35
0018,Male,20,21,66
0019,Male,52,23,29
0020,Female,35,23,98`;
    
    setFile({ name: 'Mall_Customers_Sample.csv' } as File);
    const parsed = parseCSV(sampleCsv);
    const csvHeaders = parsed[0];
    setHeaders(csvHeaders);
    setCsvData(parsed.slice(1));
    runAutoMapping(csvHeaders);
  };

  const runAutoMapping = (csvHeaders: string[]) => {
    const newMapping = {
      name: '',
      email: '',
      phone: '',
      city: '',
      gender: '',
      total_spend: '',
      order_count: '',
      visit_count: '',
    };

    csvHeaders.forEach((h) => {
      const lower = h.toLowerCase().trim();
      
      // Name
      if (lower.includes('name') && !lower.includes('company')) {
        newMapping.name = h;
      }
      // Email
      else if (lower.includes('email') || lower.includes('mail')) {
        newMapping.email = h;
      }
      // Phone
      else if (lower.includes('phone') || lower.includes('mobile') || lower.includes('contact') || lower.includes('tele')) {
        newMapping.phone = h;
      }
      // City
      else if (lower.includes('city') || lower.includes('location') || lower.includes('address')) {
        newMapping.city = h;
      }
      // Gender
      else if (lower.includes('gender') || lower.includes('genre') || lower.includes('sex')) {
        newMapping.gender = h;
      }
      // Total Spend (Prioritize annual income/revenue/spend, ignore spending score)
      else if ((lower.includes('income') || lower.includes('spend') || lower.includes('salary') || lower.includes('revenue')) && !lower.includes('score')) {
        newMapping.total_spend = h;
      }
      // Order Count / Spending Score (As a backup engagement proxy)
      else if (lower.includes('order') || lower.includes('purchase') || lower.includes('transactions')) {
        newMapping.order_count = h;
      } 
      else if (lower.includes('score') && !newMapping.order_count) {
        newMapping.order_count = h; // Map spending score to order count as proxy
      }
      // Visit Count
      else if (lower.includes('visit') || lower.includes('session') || lower.includes('freq')) {
        newMapping.visit_count = h;
      }
    });

    // Special detect if "k$" is in total spend column to apply multiplier
    if (newMapping.total_spend && newMapping.total_spend.toLowerCase().includes('k$')) {
      setMultiplier(1000);
    } else {
      setMultiplier(1);
    }

    setMapping(newMapping);
    setStep('mapping');
  };

  const processFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please upload a valid .csv file');
      return;
    }
    setFile(selectedFile);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length < 2) {
        toast.error('The CSV must contain a header row and at least one data row');
        return;
      }
      
      const csvHeaders = parsed[0];
      setHeaders(csvHeaders);
      setCsvData(parsed.slice(1));
      runAutoMapping(csvHeaders);
    };
    reader.readAsText(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) processFile(droppedFile);
  };

  // Maps values from a row into a structured customer record
  const mapRowToCustomer = (row: string[], index: number) => {
    const getVal = (headerName: string) => {
      const idx = headers.indexOf(headerName);
      return idx !== -1 ? row[idx] : undefined;
    };

    // Determine gender
    let rawGender = getVal(mapping.gender);
    let gender: 'male' | 'female' | 'other' | null = null;
    if (rawGender) {
      const g = rawGender.toLowerCase().trim();
      if (g === 'male' || g === 'm') gender = 'male';
      else if (g === 'female' || g === 'f') gender = 'female';
      else gender = 'other';
    }

    // Generate names if missing
    let name = getVal(mapping.name);
    if (!name) {
      const g = gender ?? 'other';
      const pool = FIRST_NAMES[g];
      const firstName = pool[Math.floor((index * 7 + 13) % pool.length)];
      const lastName = LAST_NAMES[Math.floor((index * 11 + 29) % LAST_NAMES.length)];
      name = `${firstName} ${lastName}`;
    }

    // Generate email if missing
    let email = getVal(mapping.email);
    if (!email) {
      const emailName = name.toLowerCase().replace(/\s+/g, '.');
      email = `${emailName}${index}@example.com`;
    }

    // Generate phone if missing
    let phone = getVal(mapping.phone);
    if (!phone) {
      // Create reproducible simulated phone numbers
      const numPart = String(1000000 + (index * 179) % 9000000);
      phone = `+919876${numPart}`;
    }

    // Parse numbers
    let totalSpendVal = parseFloat(getVal(mapping.total_spend) ?? '0');
    if (!isNaN(totalSpendVal)) {
      totalSpendVal = totalSpendVal * multiplier;
    } else {
      totalSpendVal = 0;
    }

    let orderCountVal = parseInt(getVal(mapping.order_count) ?? '0', 10);
    if (isNaN(orderCountVal)) orderCountVal = 0;

    let visitCountVal = parseInt(getVal(mapping.visit_count) ?? '0', 10);
    if (isNaN(visitCountVal)) {
      visitCountVal = orderCountVal + Math.floor((index * 3) % 4);
    }

    let city = getVal(mapping.city);
    if (!city) {
      city = CITIES[Math.floor((index * 5 + 3) % CITIES.length)];
    }

    return {
      name,
      email,
      phone,
      city,
      gender,
      total_spend: totalSpendVal,
      order_count: orderCountVal,
      visit_count: visitCountVal,
      tags: ['Imported CSV'],
    };
  };

  const previewRows = useMemo(() => {
    return csvData.slice(0, 5).map((row, idx) => mapRowToCustomer(row, idx));
  }, [csvData, mapping, headers, multiplier]);

  const importMutation = useMutation({
    mutationFn: (customers: any[]) => customersApi.import(customers),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      setStep('success');
      toast.success(`Successfully imported ${res.inserted} customers!`);
    },
    onError: (err: Error) => {
      setStep('preview');
      toast.error(`Import failed: ${err.message}`);
    }
  });

  const handleImportSubmit = () => {
    setStep('progress');
    const allCustomers = csvData.map((row, idx) => mapRowToCustomer(row, idx));
    importMutation.mutate(allCustomers);
  };

  const resetState = () => {
    setFile(null);
    setCsvData([]);
    setHeaders([]);
    setStep('upload');
    setMapping({
      name: '',
      email: '',
      phone: '',
      city: '',
      gender: '',
      total_spend: '',
      order_count: '',
      visit_count: '',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); resetState(); } }}>
      <DialogContent className="max-w-xl dark:bg-zinc-900 dark:border-zinc-800 transition-colors duration-200">
        <DialogHeader>
          <DialogTitle className="text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            Import Customers from CSV
          </DialogTitle>
          <DialogDescription className="dark:text-zinc-400">
            Upload your customer list to sync them with your CRM segments and marketing tools.
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="py-4"
            >
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors duration-150 ${
                  isDragOver
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-blue-400 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-950/20'
                }`}
              >
                <div className="rounded-full bg-blue-50 dark:bg-zinc-800 p-3 text-blue-600 dark:text-blue-400 mb-3">
                  <Upload size={24} />
                </div>
                <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                  Drag & drop your CSV file here, or <span className="text-blue-600 hover:underline">browse</span>
                </p>
                <p className="text-xs text-zinc-400 mt-1">Supports standard CSV files up to 5,000 rows</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv"
                  className="hidden"
                />
              </div>

              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="text-xs text-zinc-400 dark:text-zinc-500">Want to test with sample data?</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); loadSampleDataset(); }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                >
                  Load Sample Dataset
                </button>
              </div>
            </motion.div>
          )}

          {step === 'mapping' && (
            <motion.div
              key="mapping"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-4 py-2 overflow-y-auto max-h-[380px] pr-1"
            >
              <div className="flex items-center gap-2 rounded-md bg-blue-50/50 dark:bg-zinc-800/50 border border-blue-100 dark:border-zinc-800 p-3 text-xs text-blue-800 dark:text-zinc-300">
                <HelpCircle size={15} className="shrink-0 text-blue-500" />
                <p>
                  Map the columns in your CSV to CRM attributes. We’ve auto-detected matches based on column names.
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Field Mappings</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'name', label: 'Name *', desc: 'Full name' },
                    { key: 'email', label: 'Email *', desc: 'Unique email address' },
                    { key: 'phone', label: 'Phone', desc: 'Contact phone number' },
                    { key: 'city', label: 'City', desc: 'Residential city' },
                    { key: 'gender', label: 'Gender', desc: 'male, female, or other' },
                    { key: 'total_spend', label: 'Total Spend', desc: 'Cumulative spending' },
                    { key: 'order_count', label: 'Order Count', desc: 'Total orders placed' },
                    { key: 'visit_count', label: 'Visit Count', desc: 'Total visits/sessions' },
                  ].map((field) => (
                    <div key={field.key} className="space-y-1">
                      <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex justify-between">
                        <span>{field.label}</span>
                        {!mapping[field.key as keyof ColumnMapping] && (
                          <span className="text-[10px] text-zinc-400 italic">Auto-Generate</span>
                        )}
                      </label>
                      <select
                        value={mapping[field.key as keyof ColumnMapping]}
                        onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                        className="w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2 text-xs text-zinc-800 dark:text-zinc-200 outline-none focus:border-blue-400"
                      >
                        <option value="">-- Auto-generate or None --</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {mapping.total_spend && (
                <div className="rounded-md border border-zinc-100 dark:border-zinc-800 p-3 bg-zinc-50/50 dark:bg-zinc-950/20 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <p className="font-medium text-zinc-800 dark:text-zinc-200">Spend multiplier</p>
                    <p className="text-zinc-400">Multiply spend values (e.g. if annual income is in thousands)</p>
                  </div>
                  <select
                    value={multiplier}
                    onChange={(e) => setMultiplier(parseFloat(e.target.value))}
                    className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-2 py-1 outline-none text-zinc-700 dark:text-zinc-300"
                  >
                    <option value={1}>Raw value (×1)</option>
                    <option value={1000}>In thousands (×1,000)</option>
                    <option value={100000}>In Lakhs (×1,00,000)</option>
                  </select>
                </div>
              )}
            </motion.div>
          )}

          {step === 'preview' && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-4 py-2"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Data Preview (First 5 rows)</p>
                <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-500 font-medium">
                  {csvData.length} records ready to import
                </span>
              </div>

              <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-medium">
                        <th className="p-2.5">Name</th>
                        <th className="p-2.5">Email</th>
                        <th className="p-2.5">City</th>
                        <th className="p-2.5">Gender</th>
                        <th className="p-2.5 text-right">Spend</th>
                        <th className="p-2.5 text-right">Orders</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {previewRows.map((c, i) => (
                        <tr key={i} className="text-zinc-700 dark:text-zinc-300">
                          <td className="p-2.5 font-medium text-zinc-900 dark:text-zinc-100">{c.name}</td>
                          <td className="p-2.5 text-zinc-400">{c.email}</td>
                          <td className="p-2.5">{c.city}</td>
                          <td className="p-2.5 capitalize">{c.gender ?? '—'}</td>
                          <td className="p-2.5 text-right font-medium text-zinc-900 dark:text-zinc-100">
                            ₹{c.total_spend.toLocaleString()}
                          </td>
                          <td className="p-2.5 text-right">{c.order_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-zinc-400 italic">
                <AlertCircle size={13} className="text-zinc-400 shrink-0" />
                <p>Crucial fields missing in CSV (such as name or email) will be auto-generated with realistic mock defaults.</p>
              </div>
            </motion.div>
          )}

          {step === 'progress' && (
            <motion.div
              key="progress"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 flex flex-col items-center justify-center text-center space-y-4"
            >
              <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">Uploading and Ingesting Customers...</p>
                <p className="text-xs text-zinc-400 mt-1">Please keep this window open while processing is in progress.</p>
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="py-10 flex flex-col items-center justify-center text-center space-y-4"
            >
              <div className="rounded-full bg-green-50 dark:bg-green-950/20 p-3 text-green-600 dark:text-green-400">
                <Check size={28} />
              </div>
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">Ingestion Complete!</p>
                <p className="text-xs text-zinc-400 mt-1">
                  Your customer data has been parsed, mapped, and successfully imported into the database.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter className="border-t border-zinc-100 dark:border-zinc-800 pt-3 flex items-center justify-between sm:justify-between">
          <div>
            {step === 'mapping' && (
              <button
                onClick={() => setStep('upload')}
                className="text-xs text-zinc-500 hover:text-zinc-700 font-medium"
              >
                Back to Upload
              </button>
            )}
            {step === 'preview' && (
              <button
                onClick={() => setStep('mapping')}
                className="text-xs text-zinc-500 hover:text-zinc-700 font-medium"
              >
                Back to Mapping
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {step !== 'progress' && step !== 'success' && (
              <button
                onClick={() => { onClose(); resetState(); }}
                className="rounded-md border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
            )}

            {step === 'mapping' && (
              <button
                onClick={() => setStep('preview')}
                className="flex items-center gap-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-medium"
              >
                Next to Preview
                <ArrowRight size={13} />
              </button>
            )}

            {step === 'preview' && (
              <button
                onClick={handleImportSubmit}
                disabled={importMutation.isPending}
                className="rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-1.5 text-xs font-medium"
              >
                Confirm Import
              </button>
            )}

            {step === 'success' && (
              <button
                onClick={() => { onClose(); resetState(); }}
                className="rounded-md bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 text-xs font-medium"
              >
                Done
              </button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
