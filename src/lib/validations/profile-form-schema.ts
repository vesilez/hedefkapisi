import { PUBLIC_REGISTER_ROLES, type PublicRegisterRole } from "./auth-schema";
import {
  baseUserProfileSchema,
  mentorProfileSchema,
  studentProfileSchema,
  supporterProfileSchema,
} from "./user-schema";
import { z } from "zod";

const commonProfileFormSchema = baseUserProfileSchema
  .pick({ name: true, surname: true, email: true, phone: true, city: true })
  .extend({ bio: studentProfileSchema.shape.bio });

const studentProfileFormSchema = commonProfileFormSchema.extend({
  role: z.literal("student"),
  schoolType: studentProfileSchema.shape.schoolType,
  schoolName: studentProfileSchema.shape.schoolName,
  department: studentProfileSchema.shape.department,
  grade: studentProfileSchema.shape.grade,
  dateOfBirth: studentProfileSchema.shape.dateOfBirth,
  guardianApprovalRequired: studentProfileSchema.shape.guardianApprovalRequired,
});

const supporterProfileFormSchema = commonProfileFormSchema.extend({
  role: z.literal("supporter"),
  supporterType: supporterProfileSchema.shape.supporterType,
  organizationName: supporterProfileSchema.shape.organizationName,
  title: supporterProfileSchema.shape.title,
  expertiseAreas: supporterProfileSchema.shape.expertiseAreas.default([]),
  supportTypes: supporterProfileSchema.shape.supportTypes.default([]),
  website: supporterProfileSchema.shape.website,
  linkedin: supporterProfileSchema.shape.linkedin,
});

const mentorProfileFormSchema = commonProfileFormSchema.extend({
  role: z.literal("mentor"),
  profession: mentorProfileSchema.shape.profession,
  organization: mentorProfileSchema.shape.organization,
  expertiseAreas: mentorProfileSchema.shape.expertiseAreas,
  experienceYears: mentorProfileSchema.shape.experienceYears,
  biography: mentorProfileSchema.shape.biography,
  mentoringTopics: mentorProfileSchema.shape.mentoringTopics,
  availability: mentorProfileSchema.shape.availability,
  linkedinUrl: mentorProfileSchema.shape.linkedinUrl,
  websiteUrl: mentorProfileSchema.shape.websiteUrl,
});

const roleProfileFormSchema = z.discriminatedUnion("role", [
  studentProfileFormSchema,
  supporterProfileFormSchema,
  mentorProfileFormSchema,
]);

const rawProfileFormSchema = commonProfileFormSchema.extend({
  role: z.enum(PUBLIC_REGISTER_ROLES),
  schoolType: z.string().optional(),
  schoolName: z.string().optional(),
  department: z.string().nullable().optional(),
  grade: z.string().nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  guardianApprovalRequired: z.boolean().optional(),
  supporterType: z.string().optional(),
  organizationName: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  expertiseAreas: z.array(z.string()).optional(),
  supportTypes: z.array(z.string()).optional(),
  company: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  linkedin: z.string().nullable().optional(),
  profession: z.string().optional(),
  organization: z.string().optional(),
  experienceYears: z.union([z.string(), z.number()]).optional(),
  biography: z.string().optional(),
  mentoringTopics: z.array(z.string()).optional(),
  availability: z.string().optional(),
  linkedinUrl: z.string().nullable().optional(),
  websiteUrl: z.string().nullable().optional(),
});

export const profileFormSchema = rawProfileFormSchema.transform(
  (values, context) => {
    const result = roleProfileFormSchema.safeParse(values);
    if (result.success) return result.data;

    for (const issue of result.error.issues) context.addIssue({ ...issue });
    return z.NEVER;
  },
);

export type ProfileFormInput = z.input<typeof profileFormSchema>;
export type ProfileFormValues = z.output<typeof profileFormSchema>;

export function isProfileRole(role: string): role is PublicRegisterRole {
  return role === "student" || role === "supporter" || role === "mentor";
}
