'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '@/lib/api-client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune', 'Hyderabad'];

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddCustomerModal({ isOpen, onClose }: AddCustomerModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [gender, setGender] = useState('');
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email address';
    }
    if (phone.trim() && !/^\+?[0-9\s-]{10,15}$/.test(phone.trim())) {
      newErrors.phone = 'Invalid phone number format';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => customersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.success('Customer added successfully!');
      handleClose();
    },
    onError: (err: Error) => {
      toast.error(`Failed to add customer: ${err.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    createMutation.mutate({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      city: city || null,
      gender: gender || null,
      tags: ['Manual Input'],
    });
  };

  const handleClose = () => {
    setName('');
    setEmail('');
    setPhone('');
    setCity('');
    setGender('');
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-md dark:bg-zinc-900 dark:border-zinc-800 transition-colors duration-200">
        <DialogHeader>
          <DialogTitle className="text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            Add New Customer
          </DialogTitle>
          <DialogDescription className="dark:text-zinc-400">
            Create a new customer profile. They will immediately become eligible for segmentation and campaigns.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); if (errors.name) setErrors({ ...errors, name: '' }); }}
              placeholder="e.g. Rajesh Kumar"
              className={`w-full rounded-md border bg-white dark:bg-zinc-950 p-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-blue-100 dark:focus:ring-zinc-800 ${
                errors.name 
                  ? 'border-red-500 focus:border-red-500' 
                  : 'border-zinc-200 dark:border-zinc-800 focus:border-blue-400 dark:focus:border-blue-500'
              }`}
            />
            {errors.name && <p className="text-[11px] text-red-500 font-medium">{errors.name}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors({ ...errors, email: '' }); }}
              placeholder="e.g. rajesh.kumar@gmail.com"
              className={`w-full rounded-md border bg-white dark:bg-zinc-950 p-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-blue-100 dark:focus:ring-zinc-800 ${
                errors.email 
                  ? 'border-red-500 focus:border-red-500' 
                  : 'border-zinc-200 dark:border-zinc-800 focus:border-blue-400 dark:focus:border-blue-500'
              }`}
            />
            {errors.email && <p className="text-[11px] text-red-500 font-medium">{errors.email}</p>}
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex justify-between">
              <span>Phone Number</span>
              <span className="text-[10px] text-zinc-400 font-normal">Optional</span>
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); if (errors.phone) setErrors({ ...errors, phone: '' }); }}
              placeholder="e.g. +919876543210"
              className={`w-full rounded-md border bg-white dark:bg-zinc-950 p-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-blue-100 dark:focus:ring-zinc-800 ${
                errors.phone 
                  ? 'border-red-500 focus:border-red-500' 
                  : 'border-zinc-200 dark:border-zinc-800 focus:border-blue-400 dark:focus:border-blue-500'
              }`}
            />
            {errors.phone && <p className="text-[11px] text-red-500 font-medium">{errors.phone}</p>}
          </div>

          {/* City & Gender row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">City</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2.5 text-sm text-zinc-700 dark:text-zinc-200 outline-none focus:border-blue-400 dark:focus:border-blue-500"
              >
                <option value="">Select City</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2.5 text-sm text-zinc-700 dark:text-zinc-200 outline-none focus:border-blue-400 dark:focus:border-blue-500"
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <DialogFooter className="border-t border-zinc-100 dark:border-zinc-800 pt-3 mt-4">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md border border-zinc-200 dark:border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex items-center justify-center gap-1.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 text-sm font-medium transition-colors"
            >
              {createMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Add Customer
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
