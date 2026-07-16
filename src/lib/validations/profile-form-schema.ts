import { PUBLIC_REGISTER_ROLES, type PublicRegisterRole } from "./auth-schema";
import {
  baseUserProfileSchema,
  mentorProfileSchema,
  studentProfileSchema,
  supporterProfileSchema,
} from "./user-schema";
import { z } from "zod";

export const profileFormSchema = baseUserProfileSchema
  .pick({ name: true, surname: true, email: true, phone: true, city: true })
  .extend({
    role: z.enum(PUBLIC_REGISTER_ROLES),
    bio: studentProfileSchema.shape.bio,
    schoolType: studentProfileSchema.shape.schoolType.optional(),
    schoolName: studentProfileSchema.shape.schoolName.optional(),
    department: studentProfileSchema.shape.department,
    grade: studentProfileSchema.shape.grade,
    dateOfBirth: studentProfileSchema.shape.dateOfBirth,
    guardianApprovalRequired: z.boolean().optional(),
    supporterType: supporterProfileSchema.shape.supporterType.optional(),
    organizationName: supporterProfileSchema.shape.organizationName,
    title: supporterProfileSchema.shape.title,
    expertiseAreas: supporterProfileSchema.shape.expertiseAreas.default([]),
    supportTypes: supporterProfileSchema.shape.supportTypes.default([]),
    company: mentorProfileSchema.shape.company,
    website: supporterProfileSchema.shape.website,
    linkedin: supporterProfileSchema.shape.linkedin,
  })
  .superRefine((values, context) => {
    if (values.role === "student") {
      if (!values.schoolType) {
        context.addIssue({
          code: "custom",
          path: ["schoolType"],
          message: "Okul türü seçmelisiniz.",
        });
      }
      if (!values.schoolName || values.schoolName.trim().length < 2) {
        context.addIssue({
          code: "custom",
          path: ["schoolName"],
          message: "Okul adı en az 2 karakter olmalıdır.",
        });
      }
    }

    if (values.role === "supporter" && !values.supporterType) {
      context.addIssue({
        code: "custom",
        path: ["supporterType"],
        message: "Destekçi türü seçmelisiniz.",
      });
    }

    if (values.role === "mentor" && values.expertiseAreas.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["expertiseAreas"],
        message: "En az bir uzmanlık alanı eklemelisiniz.",
      });
    }
  });

export type ProfileFormInput = z.input<typeof profileFormSchema>;
export type ProfileFormValues = z.output<typeof profileFormSchema>;

export function isProfileRole(role: string): role is PublicRegisterRole {
  return PUBLIC_REGISTER_ROLES.some((profileRole) => profileRole === role);
}
