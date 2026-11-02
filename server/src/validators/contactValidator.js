const { z } = require('zod');

const contactCreateSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(255),
  company: z.string().max(255).optional().nullable(),
  companyId: z.string().uuid().optional().nullable(),
  designation: z.string().max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  alternatePhone: z.string().max(50).optional().nullable(),
  email: z.string().email('Invalid email address format').or(z.literal('')).optional().nullable(),
  website: z.string().max(255).optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
  frontImagePublicId: z.string().optional().nullable(),
  frontImageSecureUrl: z.string().optional().nullable(),
  backImagePublicId: z.string().optional().nullable(),
  backImageSecureUrl: z.string().optional().nullable(),
  originalOcrText: z.string().optional().nullable(),
});

const contactUpdateSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(255).optional(),
  company: z.string().max(255).optional().nullable(),
  companyId: z.string().uuid().optional().nullable(),
  designation: z.string().max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  alternatePhone: z.string().max(50).optional().nullable(),
  email: z.string().email('Invalid email address format').or(z.literal('')).optional().nullable(),
  website: z.string().max(255).optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
});

const checkDuplicateSchema = z.object({
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  fullName: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  excludeId: z.string().uuid().optional().nullable(),
});

module.exports = {
  contactCreateSchema,
  contactUpdateSchema,
  checkDuplicateSchema,
};

