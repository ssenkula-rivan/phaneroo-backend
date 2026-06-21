export enum Role {
  SUPER_ADMIN = 'super_admin',
  NATIONAL_ADMIN = 'national_admin',
  REGIONAL_ADMIN = 'regional_admin',
  DISTRICT_ADMIN = 'district_admin',
  STAGE_LEADER = 'stage_leader',
  COORDINATOR = 'coordinator',
  DRIVER = 'driver',
  VIEWER = 'viewer',
}

export const ADMIN_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  Role.NATIONAL_ADMIN,
  Role.REGIONAL_ADMIN,
  Role.DISTRICT_ADMIN,
];
