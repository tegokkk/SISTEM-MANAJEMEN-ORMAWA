-- ============================================================================
-- SIM ORMAWA & HMJ — Multi-Tenant
-- Baseline schema for MySQL 8.0.16+
-- Generated for the PBL project. Review before production use.
-- ============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS sim_ormawa_hmj
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sim_ormawa_hmj;

-- ==========================================================================
-- 1. MASTER AKADEMIK
-- ==========================================================================

CREATE TABLE IF NOT EXISTS departments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(30) NOT NULL,
  name VARCHAR(150) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_departments_code (code),
  UNIQUE KEY uq_departments_name (name),
  KEY idx_departments_active (is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS study_programs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  department_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(30) NOT NULL,
  name VARCHAR(150) NOT NULL,
  degree_level VARCHAR(30) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_study_programs_code (code),
  UNIQUE KEY uq_study_programs_department_name (department_id, name),
  KEY idx_study_programs_department_active (department_id, is_active),
  CONSTRAINT fk_study_programs_department
    FOREIGN KEY (department_id) REFERENCES departments (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ==========================================================================
-- 2. USER, ROLE, DAN PERMISSION
-- ==========================================================================

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(191) NOT NULL,
  password_hash VARCHAR(255) NULL,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NULL,
  avatar_url VARCHAR(500) NULL,
  auth_provider ENUM('LOCAL', 'SSO') NOT NULL DEFAULT 'LOCAL',
  provider_subject VARCHAR(191) NULL,
  status ENUM('PENDING', 'ACTIVE', 'SUSPENDED', 'DISABLED') NOT NULL DEFAULT 'PENDING',
  email_verified_at DATETIME(3) NULL,
  last_login_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_provider_identity (auth_provider, provider_subject),
  KEY idx_users_status (status),
  KEY idx_users_deleted_at (deleted_at),
  CONSTRAINT chk_users_local_password CHECK (
    auth_provider <> 'LOCAL' OR password_hash IS NOT NULL
  )
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(60) NOT NULL,
  name VARCHAR(100) NOT NULL,
  scope ENUM('SYSTEM', 'TENANT') NOT NULL,
  description VARCHAR(255) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_code (code),
  KEY idx_roles_scope_active (scope, is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(100) NOT NULL,
  name VARCHAR(150) NOT NULL,
  scope ENUM('SYSTEM', 'TENANT') NOT NULL,
  description VARCHAR(255) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_permissions_code (code),
  KEY idx_permissions_scope (scope)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_permissions_role
    FOREIGN KEY (role_id) REFERENCES roles (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_role_permissions_permission
    FOREIGN KEY (permission_id) REFERENCES permissions (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ==========================================================================
-- 3. TENANT DAN KEANGGOTAAN USER
-- ==========================================================================

CREATE TABLE IF NOT EXISTS tenants (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_type ENUM('ORMAWA', 'HMJ', 'HIMA') NOT NULL,
  parent_tenant_id BIGINT UNSIGNED NULL,
  department_id BIGINT UNSIGNED NULL,
  study_program_id BIGINT UNSIGNED NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(180) NOT NULL,
  slug VARCHAR(191) NOT NULL,
  description TEXT NULL,
  email VARCHAR(191) NULL,
  phone VARCHAR(30) NULL,
  address TEXT NULL,
  status ENUM('PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'INACTIVE')
    NOT NULL DEFAULT 'PENDING',
  approved_at DATETIME(3) NULL,
  suspended_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  active_hmj_department_id BIGINT UNSIGNED
    GENERATED ALWAYS AS (
      CASE
        WHEN tenant_type = 'HMJ' AND status = 'ACTIVE' AND deleted_at IS NULL
        THEN department_id
        ELSE NULL
      END
    ) STORED,
  active_hima_study_program_id BIGINT UNSIGNED
    GENERATED ALWAYS AS (
      CASE
        WHEN tenant_type = 'HIMA' AND status = 'ACTIVE' AND deleted_at IS NULL
        THEN study_program_id
        ELSE NULL
      END
    ) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tenants_code (code),
  UNIQUE KEY uq_tenants_slug (slug),
  UNIQUE KEY uq_tenants_id_scope (id, tenant_type),
  UNIQUE KEY uq_active_hmj_per_department (active_hmj_department_id),
  UNIQUE KEY uq_active_hima_per_study_program (active_hima_study_program_id),
  KEY idx_tenants_type_status (tenant_type, status),
  KEY idx_tenants_parent_status (parent_tenant_id, status),
  KEY idx_tenants_department (department_id),
  KEY idx_tenants_study_program (study_program_id),
  KEY idx_tenants_deleted_at (deleted_at),
  CONSTRAINT fk_tenants_parent
    FOREIGN KEY (parent_tenant_id) REFERENCES tenants (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_tenants_department
    FOREIGN KEY (department_id) REFERENCES departments (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_tenants_study_program
    FOREIGN KEY (study_program_id) REFERENCES study_programs (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_tenants_shape CHECK (
    (tenant_type = 'ORMAWA'
      AND parent_tenant_id IS NULL
      AND study_program_id IS NULL)
    OR
    (tenant_type = 'HMJ'
      AND parent_tenant_id IS NULL
      AND department_id IS NOT NULL
      AND study_program_id IS NULL)
    OR
    (tenant_type = 'HIMA'
      AND parent_tenant_id IS NOT NULL
      AND department_id IS NOT NULL
      AND study_program_id IS NOT NULL)
  )
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  tenant_id BIGINT UNSIGNED NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_by_user_id BIGINT UNSIGNED NULL,
  assigned_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  revoked_at DATETIME(3) NULL,
  tenant_scope_key BIGINT UNSIGNED
    GENERATED ALWAYS AS (IFNULL(tenant_id, 0)) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_roles_assignment (user_id, role_id, tenant_scope_key),
  KEY idx_user_roles_tenant_active (tenant_id, is_active),
  KEY idx_user_roles_role_active (role_id, is_active),
  CONSTRAINT fk_user_roles_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_role
    FOREIGN KEY (role_id) REFERENCES roles (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_user_roles_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_assigned_by
    FOREIGN KEY (assigned_by_user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS auth_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  active_tenant_id BIGINT UNSIGNED NULL,
  ip_address VARBINARY(16) NULL,
  user_agent VARCHAR(500) NULL,
  expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_auth_sessions_token_hash (token_hash),
  KEY idx_auth_sessions_user_expiry (user_id, expires_at),
  KEY idx_auth_sessions_active_tenant (active_tenant_id),
  CONSTRAINT fk_auth_sessions_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_auth_sessions_active_tenant
    FOREIGN KEY (active_tenant_id) REFERENCES tenants (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  used_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_password_reset_token_hash (token_hash),
  KEY idx_password_reset_user_expiry (user_id, expires_at),
  CONSTRAINT fk_password_reset_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS email_verifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  used_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_email_verification_token_hash (token_hash),
  KEY idx_email_verification_user_expiry (user_id, expires_at),
  CONSTRAINT fk_email_verification_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ==========================================================================
-- 4. PENGAJUAN TENANT
-- ==========================================================================

CREATE TABLE IF NOT EXISTS tenant_applications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  applicant_user_id BIGINT UNSIGNED NOT NULL,
  requested_type ENUM('ORMAWA', 'HMJ', 'HIMA') NOT NULL,
  requested_parent_tenant_id BIGINT UNSIGNED NULL,
  requested_department_id BIGINT UNSIGNED NULL,
  requested_study_program_id BIGINT UNSIGNED NULL,
  organization_code VARCHAR(50) NOT NULL,
  organization_name VARCHAR(180) NOT NULL,
  organization_email VARCHAR(191) NULL,
  organization_phone VARCHAR(30) NULL,
  description TEXT NULL,
  reason TEXT NULL,
  status ENUM('DRAFT', 'SUBMITTED', 'REVISION_REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED')
    NOT NULL DEFAULT 'DRAFT',
  reviewer_user_id BIGINT UNSIGNED NULL,
  reviewer_tenant_id BIGINT UNSIGNED NULL,
  reviewer_note TEXT NULL,
  approved_tenant_id BIGINT UNSIGNED NULL,
  submitted_at DATETIME(3) NULL,
  reviewed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_tenant_applications_status_type (status, requested_type, created_at),
  KEY idx_tenant_applications_applicant (applicant_user_id, created_at),
  KEY idx_tenant_applications_parent (requested_parent_tenant_id, status),
  KEY idx_tenant_applications_reviewer (reviewer_user_id, status),
  CONSTRAINT fk_tenant_applications_applicant
    FOREIGN KEY (applicant_user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_tenant_applications_parent
    FOREIGN KEY (requested_parent_tenant_id) REFERENCES tenants (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_tenant_applications_department
    FOREIGN KEY (requested_department_id) REFERENCES departments (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_tenant_applications_study_program
    FOREIGN KEY (requested_study_program_id) REFERENCES study_programs (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_tenant_applications_reviewer
    FOREIGN KEY (reviewer_user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_tenant_applications_reviewer_tenant
    FOREIGN KEY (reviewer_tenant_id) REFERENCES tenants (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_tenant_applications_approved_tenant
    FOREIGN KEY (approved_tenant_id) REFERENCES tenants (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT chk_tenant_applications_shape CHECK (
    (requested_type = 'ORMAWA'
      AND requested_parent_tenant_id IS NULL
      AND requested_study_program_id IS NULL)
    OR
    (requested_type = 'HMJ'
      AND requested_parent_tenant_id IS NULL
      AND requested_department_id IS NOT NULL
      AND requested_study_program_id IS NULL)
    OR
    (requested_type = 'HIMA'
      AND requested_parent_tenant_id IS NOT NULL
      AND requested_department_id IS NOT NULL
      AND requested_study_program_id IS NOT NULL)
  )
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tenant_application_status_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_application_id BIGINT UNSIGNED NOT NULL,
  from_status ENUM('DRAFT', 'SUBMITTED', 'REVISION_REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED') NULL,
  to_status ENUM('DRAFT', 'SUBMITTED', 'REVISION_REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL,
  actor_user_id BIGINT UNSIGNED NOT NULL,
  actor_tenant_id BIGINT UNSIGNED NULL,
  note TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_tenant_application_history_application (tenant_application_id, created_at),
  CONSTRAINT fk_tenant_application_history_application
    FOREIGN KEY (tenant_application_id) REFERENCES tenant_applications (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_tenant_application_history_actor
    FOREIGN KEY (actor_user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_tenant_application_history_actor_tenant
    FOREIGN KEY (actor_tenant_id) REFERENCES tenants (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- ==========================================================================
-- 5. FILE DAN PROFIL PUBLIK TENANT
-- ==========================================================================

CREATE TABLE IF NOT EXISTS files (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT UNSIGNED NULL,
  uploaded_by_user_id BIGINT UNSIGNED NOT NULL,
  storage_driver VARCHAR(30) NOT NULL,
  storage_key VARCHAR(500) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(150) NOT NULL,
  extension VARCHAR(20) NULL,
  size_bytes BIGINT UNSIGNED NOT NULL,
  checksum_sha256 CHAR(64) NULL,
  visibility ENUM('PRIVATE', 'PUBLIC') NOT NULL DEFAULT 'PRIVATE',
  scan_status ENUM('PENDING', 'CLEAN', 'REJECTED', 'FAILED') NOT NULL DEFAULT 'PENDING',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_files_storage_key (storage_key),
  KEY idx_files_tenant_created (tenant_id, created_at),
  KEY idx_files_uploader (uploaded_by_user_id),
  KEY idx_files_deleted_at (deleted_at),
  CONSTRAINT fk_files_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_files_uploader
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_files_size CHECK (size_bytes > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tenant_application_files (
  tenant_application_id BIGINT UNSIGNED NOT NULL,
  file_id BIGINT UNSIGNED NOT NULL,
  document_type VARCHAR(80) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (tenant_application_id, file_id),
  CONSTRAINT fk_tenant_application_files_application
    FOREIGN KEY (tenant_application_id) REFERENCES tenant_applications (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_tenant_application_files_file
    FOREIGN KEY (file_id) REFERENCES files (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tenant_public_profiles (
  tenant_id BIGINT UNSIGNED NOT NULL,
  logo_file_id BIGINT UNSIGNED NULL,
  vision TEXT NULL,
  mission TEXT NULL,
  website_url VARCHAR(500) NULL,
  instagram_url VARCHAR(500) NULL,
  public_email VARCHAR(191) NULL,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at DATETIME(3) NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (tenant_id),
  CONSTRAINT fk_tenant_public_profiles_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_tenant_public_profiles_logo
    FOREIGN KEY (logo_file_id) REFERENCES files (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- ==========================================================================
-- 6. ANGGOTA, PERIODE, JABATAN, DAN STRUKTUR
-- ==========================================================================

CREATE TABLE IF NOT EXISTS members (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  study_program_id BIGINT UNSIGNED NULL,
  student_number VARCHAR(50) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(191) NULL,
  phone VARCHAR(30) NULL,
  cohort_year SMALLINT UNSIGNED NULL,
  gender ENUM('MALE', 'FEMALE', 'UNSPECIFIED') NOT NULL DEFAULT 'UNSPECIFIED',
  status ENUM('ACTIVE', 'INACTIVE', 'ALUMNI') NOT NULL DEFAULT 'ACTIVE',
  joined_at DATE NULL,
  left_at DATE NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_members_tenant_student_number (tenant_id, student_number),
  UNIQUE KEY uq_members_id_tenant (id, tenant_id),
  KEY idx_members_tenant_status (tenant_id, status),
  KEY idx_members_user (user_id),
  KEY idx_members_study_program (study_program_id),
  CONSTRAINT fk_members_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_members_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_members_study_program
    FOREIGN KEY (study_program_id) REFERENCES study_programs (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_members_cohort_year CHECK (
    cohort_year IS NULL OR cohort_year BETWEEN 1900 AND 2200
  ),
  CONSTRAINT chk_members_dates CHECK (
    left_at IS NULL OR joined_at IS NULL OR left_at >= joined_at
  )
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS periods (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('PLANNED', 'ACTIVE', 'CLOSED') NOT NULL DEFAULT 'PLANNED',
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  active_tenant_id BIGINT UNSIGNED
    GENERATED ALWAYS AS (
      CASE WHEN status = 'ACTIVE' THEN tenant_id ELSE NULL END
    ) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_periods_tenant_name (tenant_id, name),
  UNIQUE KEY uq_periods_id_tenant (id, tenant_id),
  UNIQUE KEY uq_periods_one_active_per_tenant (active_tenant_id),
  KEY idx_periods_tenant_status (tenant_id, status),
  CONSTRAINT fk_periods_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_periods_creator
    FOREIGN KEY (created_by_user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_periods_dates CHECK (end_date >= start_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS positions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(120) NOT NULL,
  level SMALLINT UNSIGNED NOT NULL DEFAULT 100,
  description VARCHAR(255) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_positions_tenant_code (tenant_id, code),
  UNIQUE KEY uq_positions_id_tenant (id, tenant_id),
  KEY idx_positions_tenant_active_level (tenant_id, is_active, level),
  CONSTRAINT fk_positions_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS organization_assignments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT UNSIGNED NOT NULL,
  period_id BIGINT UNSIGNED NOT NULL,
  member_id BIGINT UNSIGNED NOT NULL,
  position_id BIGINT UNSIGNED NOT NULL,
  reports_to_assignment_id BIGINT UNSIGNED NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  start_date DATE NULL,
  end_date DATE NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_assignments_period_member_position (period_id, member_id, position_id),
  KEY idx_assignments_tenant_period (tenant_id, period_id),
  KEY idx_assignments_parent (reports_to_assignment_id),
  CONSTRAINT fk_assignments_period_scope
    FOREIGN KEY (period_id, tenant_id) REFERENCES periods (id, tenant_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_assignments_member_scope
    FOREIGN KEY (member_id, tenant_id) REFERENCES members (id, tenant_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_assignments_position_scope
    FOREIGN KEY (position_id, tenant_id) REFERENCES positions (id, tenant_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_assignments_parent
    FOREIGN KEY (reports_to_assignment_id) REFERENCES organization_assignments (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT chk_assignments_dates CHECK (
    end_date IS NULL OR start_date IS NULL OR end_date >= start_date
  )
) ENGINE=InnoDB;

-- ==========================================================================
-- 7. PROGRAM KERJA DAN PROPOSAL
-- ==========================================================================

CREATE TABLE IF NOT EXISTS work_programs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT UNSIGNED NOT NULL,
  period_id BIGINT UNSIGNED NOT NULL,
  responsible_member_id BIGINT UNSIGNED NULL,
  reviewer_tenant_id BIGINT UNSIGNED NULL,
  code VARCHAR(60) NOT NULL,
  name VARCHAR(180) NOT NULL,
  description TEXT NULL,
  objective TEXT NULL,
  location VARCHAR(255) NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  proposed_budget DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  approved_budget DECIMAL(18,2) NULL,
  status ENUM('DRAFT', 'SUBMITTED', 'REVISION_REQUESTED', 'APPROVED', 'REJECTED', 'RUNNING', 'COMPLETED', 'CANCELLED')
    NOT NULL DEFAULT 'DRAFT',
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  submitted_at DATETIME(3) NULL,
  approved_at DATETIME(3) NULL,
  started_at DATETIME(3) NULL,
  completed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_work_programs_tenant_code (tenant_id, code),
  UNIQUE KEY uq_work_programs_id_tenant (id, tenant_id),
  KEY idx_work_programs_tenant_status_date (tenant_id, status, start_date),
  KEY idx_work_programs_reviewer_status (reviewer_tenant_id, status),
  KEY idx_work_programs_period (period_id),
  CONSTRAINT fk_work_programs_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_work_programs_period_scope
    FOREIGN KEY (period_id, tenant_id) REFERENCES periods (id, tenant_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_work_programs_responsible_scope
    FOREIGN KEY (responsible_member_id, tenant_id) REFERENCES members (id, tenant_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_work_programs_reviewer_tenant
    FOREIGN KEY (reviewer_tenant_id) REFERENCES tenants (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_work_programs_creator
    FOREIGN KEY (created_by_user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_work_programs_dates CHECK (end_date >= start_date),
  CONSTRAINT chk_work_programs_budget CHECK (
    proposed_budget >= 0 AND (approved_budget IS NULL OR approved_budget >= 0)
  )
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS work_program_status_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  work_program_id BIGINT UNSIGNED NOT NULL,
  tenant_id BIGINT UNSIGNED NOT NULL,
  from_status ENUM('DRAFT', 'SUBMITTED', 'REVISION_REQUESTED', 'APPROVED', 'REJECTED', 'RUNNING', 'COMPLETED', 'CANCELLED') NULL,
  to_status ENUM('DRAFT', 'SUBMITTED', 'REVISION_REQUESTED', 'APPROVED', 'REJECTED', 'RUNNING', 'COMPLETED', 'CANCELLED') NOT NULL,
  actor_user_id BIGINT UNSIGNED NOT NULL,
  actor_tenant_id BIGINT UNSIGNED NULL,
  note TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_work_program_history_program (work_program_id, created_at),
  CONSTRAINT fk_work_program_history_program_scope
    FOREIGN KEY (work_program_id, tenant_id) REFERENCES work_programs (id, tenant_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_work_program_history_actor
    FOREIGN KEY (actor_user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_work_program_history_actor_tenant
    FOREIGN KEY (actor_tenant_id) REFERENCES tenants (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS proposals (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT UNSIGNED NOT NULL,
  work_program_id BIGINT UNSIGNED NOT NULL,
  file_id BIGINT UNSIGNED NOT NULL,
  version_number INT UNSIGNED NOT NULL,
  title VARCHAR(180) NOT NULL,
  note TEXT NULL,
  uploaded_by_user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_proposals_program_version (work_program_id, version_number),
  KEY idx_proposals_tenant_program (tenant_id, work_program_id),
  CONSTRAINT fk_proposals_program_scope
    FOREIGN KEY (work_program_id, tenant_id) REFERENCES work_programs (id, tenant_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_proposals_file
    FOREIGN KEY (file_id) REFERENCES files (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_proposals_uploader
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_proposals_version CHECK (version_number > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS proposal_review_comments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  proposal_id BIGINT UNSIGNED NOT NULL,
  reviewer_user_id BIGINT UNSIGNED NOT NULL,
  reviewer_tenant_id BIGINT UNSIGNED NULL,
  comment TEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_proposal_review_comments_proposal (proposal_id, created_at),
  CONSTRAINT fk_proposal_review_comments_proposal
    FOREIGN KEY (proposal_id) REFERENCES proposals (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_proposal_review_comments_reviewer
    FOREIGN KEY (reviewer_user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_proposal_review_comments_reviewer_tenant
    FOREIGN KEY (reviewer_tenant_id) REFERENCES tenants (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- ==========================================================================
-- 8. PENGAJUAN KEBUTUHAN
-- ==========================================================================

CREATE TABLE IF NOT EXISTS requirement_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source_tenant_id BIGINT UNSIGNED NOT NULL,
  target_tenant_id BIGINT UNSIGNED NULL,
  work_program_id BIGINT UNSIGNED NULL,
  request_number VARCHAR(60) NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NULL,
  priority ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
  status ENUM('DRAFT', 'SUBMITTED', 'REVISION_REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'FULFILLED')
    NOT NULL DEFAULT 'DRAFT',
  estimated_total DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  approved_total DECIMAL(18,2) NULL,
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  reviewer_user_id BIGINT UNSIGNED NULL,
  reviewer_note TEXT NULL,
  submitted_at DATETIME(3) NULL,
  reviewed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_requirement_requests_number (source_tenant_id, request_number),
  UNIQUE KEY uq_requirement_requests_id_source (id, source_tenant_id),
  KEY idx_requirement_requests_source_status (source_tenant_id, status, created_at),
  KEY idx_requirement_requests_target_status (target_tenant_id, status, created_at),
  CONSTRAINT fk_requirement_requests_source
    FOREIGN KEY (source_tenant_id) REFERENCES tenants (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_requirement_requests_target
    FOREIGN KEY (target_tenant_id) REFERENCES tenants (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_requirement_requests_program_scope
    FOREIGN KEY (work_program_id, source_tenant_id) REFERENCES work_programs (id, tenant_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_requirement_requests_creator
    FOREIGN KEY (created_by_user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_requirement_requests_reviewer
    FOREIGN KEY (reviewer_user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT chk_requirement_requests_amount CHECK (
    estimated_total >= 0 AND (approved_total IS NULL OR approved_total >= 0)
  )
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS requirement_request_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  requirement_request_id BIGINT UNSIGNED NOT NULL,
  item_name VARCHAR(180) NOT NULL,
  item_type ENUM('GOODS', 'SERVICE', 'FACILITY', 'OTHER') NOT NULL,
  quantity DECIMAL(14,2) NOT NULL,
  unit VARCHAR(30) NOT NULL,
  estimated_unit_price DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  approved_quantity DECIMAL(14,2) NULL,
  approved_unit_price DECIMAL(18,2) NULL,
  note VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_requirement_items_request (requirement_request_id),
  CONSTRAINT fk_requirement_items_request
    FOREIGN KEY (requirement_request_id) REFERENCES requirement_requests (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT chk_requirement_items_values CHECK (
    quantity > 0
    AND estimated_unit_price >= 0
    AND (approved_quantity IS NULL OR approved_quantity >= 0)
    AND (approved_unit_price IS NULL OR approved_unit_price >= 0)
  )
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS requirement_request_status_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  requirement_request_id BIGINT UNSIGNED NOT NULL,
  from_status ENUM('DRAFT', 'SUBMITTED', 'REVISION_REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'FULFILLED') NULL,
  to_status ENUM('DRAFT', 'SUBMITTED', 'REVISION_REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'FULFILLED') NOT NULL,
  actor_user_id BIGINT UNSIGNED NOT NULL,
  actor_tenant_id BIGINT UNSIGNED NULL,
  note TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_requirement_history_request (requirement_request_id, created_at),
  CONSTRAINT fk_requirement_history_request
    FOREIGN KEY (requirement_request_id) REFERENCES requirement_requests (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_requirement_history_actor
    FOREIGN KEY (actor_user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_requirement_history_actor_tenant
    FOREIGN KEY (actor_tenant_id) REFERENCES tenants (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS requirement_request_files (
  requirement_request_id BIGINT UNSIGNED NOT NULL,
  file_id BIGINT UNSIGNED NOT NULL,
  document_type VARCHAR(80) NOT NULL COMMENT 'mis: RAB, SURAT_PERMOHONAN, LAINNYA',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (requirement_request_id, file_id),
  CONSTRAINT fk_requirement_request_files_request
    FOREIGN KEY (requirement_request_id) REFERENCES requirement_requests (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_requirement_request_files_file
    FOREIGN KEY (file_id) REFERENCES files (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ==========================================================================
-- 9. PENGAJUAN KEUANGAN PROGRAM KERJA
-- ==========================================================================

CREATE TABLE IF NOT EXISTS finance_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source_tenant_id BIGINT UNSIGNED NOT NULL,
  target_tenant_id BIGINT UNSIGNED NULL,
  work_program_id BIGINT UNSIGNED NOT NULL,
  request_number VARCHAR(60) NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NULL,
  requested_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  approved_amount DECIMAL(18,2) NULL,
  status ENUM('DRAFT', 'SUBMITTED', 'REVISION_REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'DISBURSED')
    NOT NULL DEFAULT 'DRAFT',
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  reviewer_user_id BIGINT UNSIGNED NULL,
  reviewer_note TEXT NULL,
  submitted_at DATETIME(3) NULL,
  reviewed_at DATETIME(3) NULL,
  disbursed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_finance_requests_number (source_tenant_id, request_number),
  UNIQUE KEY uq_finance_requests_id_source (id, source_tenant_id),
  KEY idx_finance_requests_source_status (source_tenant_id, status, created_at),
  KEY idx_finance_requests_target_status (target_tenant_id, status, created_at),
  CONSTRAINT fk_finance_requests_source
    FOREIGN KEY (source_tenant_id) REFERENCES tenants (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_finance_requests_target
    FOREIGN KEY (target_tenant_id) REFERENCES tenants (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_finance_requests_program_scope
    FOREIGN KEY (work_program_id, source_tenant_id) REFERENCES work_programs (id, tenant_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_finance_requests_creator
    FOREIGN KEY (created_by_user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_finance_requests_reviewer
    FOREIGN KEY (reviewer_user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT chk_finance_requests_amount CHECK (
    requested_amount >= 0 AND (approved_amount IS NULL OR approved_amount >= 0)
  )
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS finance_request_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  finance_request_id BIGINT UNSIGNED NOT NULL,
  description VARCHAR(255) NOT NULL,
  quantity DECIMAL(14,2) NOT NULL DEFAULT 1.00,
  unit VARCHAR(30) NOT NULL DEFAULT 'item',
  requested_unit_price DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  approved_quantity DECIMAL(14,2) NULL,
  approved_unit_price DECIMAL(18,2) NULL,
  note VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_finance_request_items_request (finance_request_id),
  CONSTRAINT fk_finance_request_items_request
    FOREIGN KEY (finance_request_id) REFERENCES finance_requests (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT chk_finance_request_items_values CHECK (
    quantity > 0
    AND requested_unit_price >= 0
    AND (approved_quantity IS NULL OR approved_quantity >= 0)
    AND (approved_unit_price IS NULL OR approved_unit_price >= 0)
  )
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS finance_request_files (
  finance_request_id BIGINT UNSIGNED NOT NULL,
  file_id BIGINT UNSIGNED NOT NULL,
  document_type VARCHAR(80) NOT NULL COMMENT 'mis: RAB, KWITANSI, NOTA, LAINNYA',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (finance_request_id, file_id),
  CONSTRAINT fk_finance_request_files_request
    FOREIGN KEY (finance_request_id) REFERENCES finance_requests (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_finance_request_files_file
    FOREIGN KEY (file_id) REFERENCES files (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS finance_request_status_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  finance_request_id BIGINT UNSIGNED NOT NULL,
  from_status ENUM('DRAFT', 'SUBMITTED', 'REVISION_REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'DISBURSED') NULL,
  to_status ENUM('DRAFT', 'SUBMITTED', 'REVISION_REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'DISBURSED') NOT NULL,
  actor_user_id BIGINT UNSIGNED NOT NULL,
  actor_tenant_id BIGINT UNSIGNED NULL,
  note TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_finance_request_history_request (finance_request_id, created_at),
  CONSTRAINT fk_finance_request_history_request
    FOREIGN KEY (finance_request_id) REFERENCES finance_requests (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_finance_request_history_actor
    FOREIGN KEY (actor_user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_finance_request_history_actor_tenant
    FOREIGN KEY (actor_tenant_id) REFERENCES tenants (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- ==========================================================================
-- 10. INVENTARIS
-- ==========================================================================

CREATE TABLE IF NOT EXISTS inventory_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(60) NOT NULL,
  name VARCHAR(180) NOT NULL,
  description TEXT NULL,
  category VARCHAR(100) NULL,
  quantity DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  minimum_quantity DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  unit VARCHAR(30) NOT NULL DEFAULT 'unit',
  item_condition ENUM('GOOD', 'MINOR_DAMAGE', 'MAJOR_DAMAGE', 'LOST', 'DISPOSED')
    NOT NULL DEFAULT 'GOOD',
  location VARCHAR(180) NULL,
  acquisition_source VARCHAR(180) NULL,
  acquisition_date DATE NULL,
  acquisition_value DECIMAL(18,2) NULL,
  status ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  updated_by_user_id BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_inventory_items_tenant_code (tenant_id, code),
  UNIQUE KEY uq_inventory_items_id_tenant (id, tenant_id),
  KEY idx_inventory_items_tenant_status_condition (tenant_id, status, item_condition),
  CONSTRAINT fk_inventory_items_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_inventory_items_creator
    FOREIGN KEY (created_by_user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_inventory_items_updater
    FOREIGN KEY (updated_by_user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT chk_inventory_items_values CHECK (
    quantity >= 0
    AND minimum_quantity >= 0
    AND (acquisition_value IS NULL OR acquisition_value >= 0)
  )
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory_movements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT UNSIGNED NOT NULL,
  inventory_item_id BIGINT UNSIGNED NOT NULL,
  movement_type ENUM('INITIAL', 'IN', 'OUT', 'ADJUSTMENT', 'DAMAGED', 'LOST', 'DISPOSED') NOT NULL,
  quantity_delta DECIMAL(14,2) NOT NULL,
  resulting_quantity DECIMAL(14,2) NOT NULL,
  note VARCHAR(500) NULL,
  actor_user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_inventory_movements_item_created (inventory_item_id, created_at),
  KEY idx_inventory_movements_tenant_created (tenant_id, created_at),
  CONSTRAINT fk_inventory_movements_item_scope
    FOREIGN KEY (inventory_item_id, tenant_id) REFERENCES inventory_items (id, tenant_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_inventory_movements_actor
    FOREIGN KEY (actor_user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_inventory_movements_values CHECK (
    quantity_delta <> 0 AND resulting_quantity >= 0
  )
) ENGINE=InnoDB;

-- ==========================================================================
-- 11. KEUANGAN
-- ==========================================================================

CREATE TABLE IF NOT EXISTS transaction_categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT UNSIGNED NOT NULL,
  transaction_type ENUM('INCOME', 'EXPENSE', 'BOTH') NOT NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(255) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_transaction_categories_tenant_name (tenant_id, name),
  UNIQUE KEY uq_transaction_categories_id_tenant (id, tenant_id),
  KEY idx_transaction_categories_tenant_active (tenant_id, is_active),
  CONSTRAINT fk_transaction_categories_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS financial_transactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT UNSIGNED NOT NULL,
  transaction_number VARCHAR(60) NOT NULL,
  transaction_type ENUM('INCOME', 'EXPENSE') NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  work_program_id BIGINT UNSIGNED NULL,
  finance_request_id BIGINT UNSIGNED NULL,
  attachment_file_id BIGINT UNSIGNED NULL,
  transaction_date DATE NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  description VARCHAR(500) NOT NULL,
  payment_method VARCHAR(60) NULL,
  status ENUM('DRAFT', 'POSTED', 'VOID') NOT NULL DEFAULT 'DRAFT',
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  posted_by_user_id BIGINT UNSIGNED NULL,
  posted_at DATETIME(3) NULL,
  voided_by_user_id BIGINT UNSIGNED NULL,
  voided_at DATETIME(3) NULL,
  void_reason VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_financial_transactions_number (tenant_id, transaction_number),
  KEY idx_financial_transactions_tenant_date_type (tenant_id, transaction_date, transaction_type),
  KEY idx_financial_transactions_tenant_status (tenant_id, status),
  KEY idx_financial_transactions_program (work_program_id),
  KEY idx_financial_transactions_finance_request (finance_request_id),
  CONSTRAINT fk_financial_transactions_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_financial_transactions_category_scope
    FOREIGN KEY (category_id, tenant_id) REFERENCES transaction_categories (id, tenant_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_financial_transactions_program_scope
    FOREIGN KEY (work_program_id, tenant_id) REFERENCES work_programs (id, tenant_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_financial_transactions_finance_request_scope
    FOREIGN KEY (finance_request_id, tenant_id) REFERENCES finance_requests (id, source_tenant_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_financial_transactions_attachment
    FOREIGN KEY (attachment_file_id) REFERENCES files (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_financial_transactions_creator
    FOREIGN KEY (created_by_user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_financial_transactions_poster
    FOREIGN KEY (posted_by_user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_financial_transactions_voider
    FOREIGN KEY (voided_by_user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT chk_financial_transactions_amount CHECK (amount > 0),
  CONSTRAINT chk_financial_transactions_void CHECK (
    status <> 'VOID' OR (voided_at IS NOT NULL AND void_reason IS NOT NULL)
  )
) ENGINE=InnoDB;

-- ==========================================================================
-- 12. PESAN HMJ ↔ HIMA
-- ==========================================================================

CREATE TABLE IF NOT EXISTS conversations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  hmj_tenant_id BIGINT UNSIGNED NOT NULL,
  hima_tenant_id BIGINT UNSIGNED NOT NULL,
  subject VARCHAR(180) NULL,
  status ENUM('ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  last_message_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_conversations_hmj_hima (hmj_tenant_id, hima_tenant_id),
  KEY idx_conversations_hmj_last_message (hmj_tenant_id, last_message_at),
  KEY idx_conversations_hima_last_message (hima_tenant_id, last_message_at),
  CONSTRAINT fk_conversations_hmj
    FOREIGN KEY (hmj_tenant_id) REFERENCES tenants (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_conversations_hima
    FOREIGN KEY (hima_tenant_id) REFERENCES tenants (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_conversations_creator
    FOREIGN KEY (created_by_user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_conversations_different_tenants CHECK (hmj_tenant_id <> hima_tenant_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  conversation_id BIGINT UNSIGNED NOT NULL,
  sender_user_id BIGINT UNSIGNED NOT NULL,
  sender_tenant_id BIGINT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  attachment_file_id BIGINT UNSIGNED NULL,
  sent_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  edited_at DATETIME(3) NULL,
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_messages_conversation_sent (conversation_id, sent_at),
  KEY idx_messages_sender (sender_user_id, sent_at),
  KEY idx_messages_conversation_sender_tenant (conversation_id, sender_tenant_id),
  CONSTRAINT fk_messages_conversation
    FOREIGN KEY (conversation_id) REFERENCES conversations (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_messages_sender_user
    FOREIGN KEY (sender_user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_messages_sender_tenant
    FOREIGN KEY (sender_tenant_id) REFERENCES tenants (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_messages_attachment
    FOREIGN KEY (attachment_file_id) REFERENCES files (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT chk_messages_body CHECK (CHAR_LENGTH(TRIM(body)) > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS message_reads (
  message_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  read_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (message_id, user_id),
  KEY idx_message_reads_user (user_id, read_at),
  CONSTRAINT fk_message_reads_message
    FOREIGN KEY (message_id) REFERENCES messages (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_message_reads_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ==========================================================================
-- 13. NOTIFIKASI DAN AUDIT
-- ==========================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  recipient_user_id BIGINT UNSIGNED NOT NULL,
  tenant_id BIGINT UNSIGNED NULL,
  notification_type VARCHAR(80) NOT NULL,
  title VARCHAR(180) NOT NULL,
  body VARCHAR(1000) NOT NULL,
  target_url VARCHAR(500) NULL,
  object_type VARCHAR(80) NULL,
  object_id BIGINT UNSIGNED NULL,
  read_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_notifications_recipient_read_created (recipient_user_id, read_at, created_at),
  KEY idx_notifications_tenant_created (tenant_id, created_at),
  CONSTRAINT fk_notifications_recipient
    FOREIGN KEY (recipient_user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_notifications_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_user_id BIGINT UNSIGNED NULL,
  actor_tenant_id BIGINT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL,
  object_type VARCHAR(80) NOT NULL,
  object_id BIGINT UNSIGNED NULL,
  object_tenant_id BIGINT UNSIGNED NULL,
  request_id VARCHAR(100) NULL,
  ip_address VARBINARY(16) NULL,
  user_agent VARCHAR(500) NULL,
  before_data JSON NULL,
  after_data JSON NULL,
  metadata JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_audit_logs_actor_created (actor_user_id, created_at),
  KEY idx_audit_logs_actor_tenant_created (actor_tenant_id, created_at),
  KEY idx_audit_logs_object (object_type, object_id, created_at),
  KEY idx_audit_logs_object_tenant_created (object_tenant_id, created_at),
  KEY idx_audit_logs_action_created (action, created_at),
  CONSTRAINT fk_audit_logs_actor
    FOREIGN KEY (actor_user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_audit_logs_actor_tenant
    FOREIGN KEY (actor_tenant_id) REFERENCES tenants (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_audit_logs_object_tenant
    FOREIGN KEY (object_tenant_id) REFERENCES tenants (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- ==========================================================================
-- 14. TRIGGER VALIDASI HIERARKI MULTI-TENANT
-- ==========================================================================

DELIMITER $$

DROP TRIGGER IF EXISTS trg_tenants_validate_insert$$
CREATE TRIGGER trg_tenants_validate_insert
BEFORE INSERT ON tenants
FOR EACH ROW
BEGIN
  DECLARE v_parent_type VARCHAR(20) DEFAULT NULL;
  DECLARE v_parent_department BIGINT UNSIGNED DEFAULT NULL;
  DECLARE v_parent_status VARCHAR(20) DEFAULT NULL;
  DECLARE v_program_department BIGINT UNSIGNED DEFAULT NULL;

  IF NEW.tenant_type = 'HIMA' THEN
    SELECT tenant_type, department_id, status
      INTO v_parent_type, v_parent_department, v_parent_status
    FROM tenants
    WHERE id = NEW.parent_tenant_id AND deleted_at IS NULL
    LIMIT 1;

    SELECT department_id
      INTO v_program_department
    FROM study_programs
    WHERE id = NEW.study_program_id AND is_active = TRUE
    LIMIT 1;

    IF v_parent_type IS NULL OR v_parent_type <> 'HMJ' THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'HIMA harus memiliki parent tenant bertipe HMJ';
    END IF;

    IF v_parent_status <> 'ACTIVE' THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'HMJ induk harus berstatus ACTIVE';
    END IF;

    IF v_parent_department <> NEW.department_id
       OR v_program_department <> NEW.department_id THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Jurusan HIMA, program studi, dan HMJ induk harus sama';
    END IF;
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_tenants_validate_update$$
CREATE TRIGGER trg_tenants_validate_update
BEFORE UPDATE ON tenants
FOR EACH ROW
BEGIN
  DECLARE v_parent_type VARCHAR(20) DEFAULT NULL;
  DECLARE v_parent_department BIGINT UNSIGNED DEFAULT NULL;
  DECLARE v_parent_status VARCHAR(20) DEFAULT NULL;
  DECLARE v_program_department BIGINT UNSIGNED DEFAULT NULL;

  IF NEW.parent_tenant_id = NEW.id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Tenant tidak boleh menjadi parent untuk dirinya sendiri';
  END IF;

  IF NEW.tenant_type = 'HIMA' THEN
    SELECT tenant_type, department_id, status
      INTO v_parent_type, v_parent_department, v_parent_status
    FROM tenants
    WHERE id = NEW.parent_tenant_id AND deleted_at IS NULL
    LIMIT 1;

    SELECT department_id
      INTO v_program_department
    FROM study_programs
    WHERE id = NEW.study_program_id AND is_active = TRUE
    LIMIT 1;

    IF v_parent_type IS NULL OR v_parent_type <> 'HMJ' THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'HIMA harus memiliki parent tenant bertipe HMJ';
    END IF;

    IF v_parent_status <> 'ACTIVE' THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'HMJ induk harus berstatus ACTIVE';
    END IF;

    IF v_parent_department <> NEW.department_id
       OR v_program_department <> NEW.department_id THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Jurusan HIMA, program studi, dan HMJ induk harus sama';
    END IF;
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_tenant_applications_validate_insert$$
CREATE TRIGGER trg_tenant_applications_validate_insert
BEFORE INSERT ON tenant_applications
FOR EACH ROW
BEGIN
  DECLARE v_parent_type VARCHAR(20) DEFAULT NULL;
  DECLARE v_parent_department BIGINT UNSIGNED DEFAULT NULL;
  DECLARE v_parent_status VARCHAR(20) DEFAULT NULL;
  DECLARE v_program_department BIGINT UNSIGNED DEFAULT NULL;

  IF NEW.requested_type = 'HIMA' THEN
    SELECT tenant_type, department_id, status
      INTO v_parent_type, v_parent_department, v_parent_status
    FROM tenants
    WHERE id = NEW.requested_parent_tenant_id AND deleted_at IS NULL
    LIMIT 1;

    SELECT department_id
      INTO v_program_department
    FROM study_programs
    WHERE id = NEW.requested_study_program_id AND is_active = TRUE
    LIMIT 1;

    IF v_parent_type IS NULL OR v_parent_type <> 'HMJ' OR v_parent_status <> 'ACTIVE' THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Pengajuan HIMA membutuhkan HMJ induk aktif';
    END IF;

    IF v_parent_department <> NEW.requested_department_id
       OR v_program_department <> NEW.requested_department_id THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Jurusan pengajuan HIMA tidak sesuai dengan HMJ/prodi';
    END IF;
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_tenant_applications_validate_update$$
CREATE TRIGGER trg_tenant_applications_validate_update
BEFORE UPDATE ON tenant_applications
FOR EACH ROW
BEGIN
  IF NEW.status IN ('REVISION_REQUESTED', 'REJECTED')
     AND (NEW.reviewer_note IS NULL OR CHAR_LENGTH(TRIM(NEW.reviewer_note)) = 0) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Catatan reviewer wajib untuk revisi atau penolakan';
  END IF;

  IF NEW.status = 'APPROVED' AND NEW.approved_tenant_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Pengajuan disetujui harus terhubung ke tenant hasil persetujuan';
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_conversations_validate_insert$$
CREATE TRIGGER trg_conversations_validate_insert
BEFORE INSERT ON conversations
FOR EACH ROW
BEGIN
  DECLARE v_hmj_type VARCHAR(20) DEFAULT NULL;
  DECLARE v_hmj_status VARCHAR(20) DEFAULT NULL;
  DECLARE v_hima_type VARCHAR(20) DEFAULT NULL;
  DECLARE v_hima_parent BIGINT UNSIGNED DEFAULT NULL;
  DECLARE v_hima_status VARCHAR(20) DEFAULT NULL;

  SELECT tenant_type, status
    INTO v_hmj_type, v_hmj_status
  FROM tenants
  WHERE id = NEW.hmj_tenant_id AND deleted_at IS NULL
  LIMIT 1;

  SELECT tenant_type, parent_tenant_id, status
    INTO v_hima_type, v_hima_parent, v_hima_status
  FROM tenants
  WHERE id = NEW.hima_tenant_id AND deleted_at IS NULL
  LIMIT 1;

  IF v_hmj_type <> 'HMJ' OR v_hima_type <> 'HIMA'
     OR v_hima_parent <> NEW.hmj_tenant_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Percakapan hanya boleh antara HMJ dan HIMA anaknya';
  END IF;

  IF v_hmj_status <> 'ACTIVE' OR v_hima_status <> 'ACTIVE' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Kedua tenant percakapan harus berstatus ACTIVE';
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_conversations_validate_update$$
CREATE TRIGGER trg_conversations_validate_update
BEFORE UPDATE ON conversations
FOR EACH ROW
BEGIN
  IF NEW.hmj_tenant_id <> OLD.hmj_tenant_id
     OR NEW.hima_tenant_id <> OLD.hima_tenant_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Peserta percakapan tidak dapat diubah';
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_messages_validate_insert$$
CREATE TRIGGER trg_messages_validate_insert
BEFORE INSERT ON messages
FOR EACH ROW
BEGIN
  DECLARE v_hmj_tenant BIGINT UNSIGNED DEFAULT NULL;
  DECLARE v_hima_tenant BIGINT UNSIGNED DEFAULT NULL;
  DECLARE v_has_role INT DEFAULT 0;

  SELECT hmj_tenant_id, hima_tenant_id
    INTO v_hmj_tenant, v_hima_tenant
  FROM conversations
  WHERE id = NEW.conversation_id AND status = 'ACTIVE'
  LIMIT 1;

  IF v_hmj_tenant IS NULL
     OR NEW.sender_tenant_id NOT IN (v_hmj_tenant, v_hima_tenant) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Tenant pengirim bukan peserta percakapan';
  END IF;

  SELECT COUNT(*)
    INTO v_has_role
  FROM user_roles
  WHERE user_id = NEW.sender_user_id
    AND tenant_id = NEW.sender_tenant_id
    AND is_active = TRUE
    AND revoked_at IS NULL;

  IF v_has_role = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Pengirim tidak memiliki role aktif pada tenant';
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_messages_update_conversation$$
CREATE TRIGGER trg_messages_update_conversation
AFTER INSERT ON messages
FOR EACH ROW
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.sent_at
  WHERE id = NEW.conversation_id;
END$$

DELIMITER ;

-- ==========================================================================
-- 15. VIEW LAPORAN
-- ==========================================================================

CREATE OR REPLACE VIEW v_tenant_financial_balances AS
SELECT
  t.id AS tenant_id,
  t.code AS tenant_code,
  t.name AS tenant_name,
  COALESCE(SUM(
    CASE
      WHEN ft.status = 'POSTED' AND ft.transaction_type = 'INCOME' THEN ft.amount
      ELSE 0
    END
  ), 0) AS total_income,
  COALESCE(SUM(
    CASE
      WHEN ft.status = 'POSTED' AND ft.transaction_type = 'EXPENSE' THEN ft.amount
      ELSE 0
    END
  ), 0) AS total_expense,
  COALESCE(SUM(
    CASE
      WHEN ft.status = 'POSTED' AND ft.transaction_type = 'INCOME' THEN ft.amount
      WHEN ft.status = 'POSTED' AND ft.transaction_type = 'EXPENSE' THEN -ft.amount
      ELSE 0
    END
  ), 0) AS balance
FROM tenants t
LEFT JOIN financial_transactions ft ON ft.tenant_id = t.id
WHERE t.deleted_at IS NULL
GROUP BY t.id, t.code, t.name;

CREATE OR REPLACE VIEW v_active_tenant_periods AS
SELECT
  p.id AS period_id,
  p.tenant_id,
  t.code AS tenant_code,
  t.name AS tenant_name,
  p.name AS period_name,
  p.start_date,
  p.end_date
FROM periods p
INNER JOIN tenants t ON t.id = p.tenant_id
WHERE p.status = 'ACTIVE'
  AND t.status = 'ACTIVE'
  AND t.deleted_at IS NULL;

CREATE OR REPLACE VIEW v_work_program_summary AS
SELECT
  wp.tenant_id,
  t.code AS tenant_code,
  t.name AS tenant_name,
  wp.status,
  COUNT(*) AS total
FROM work_programs wp
INNER JOIN tenants t ON t.id = wp.tenant_id
WHERE wp.deleted_at IS NULL
  AND t.deleted_at IS NULL
GROUP BY wp.tenant_id, t.code, t.name, wp.status;

CREATE OR REPLACE VIEW v_member_counts AS
SELECT
  m.tenant_id,
  t.code AS tenant_code,
  t.name AS tenant_name,
  m.status,
  m.gender,
  COUNT(*) AS total
FROM members m
INNER JOIN tenants t ON t.id = m.tenant_id
WHERE m.deleted_at IS NULL
  AND t.deleted_at IS NULL
GROUP BY m.tenant_id, t.code, t.name, m.status, m.gender;

CREATE OR REPLACE VIEW v_pending_requests AS
SELECT
  'REQUIREMENT' AS request_type,
  source_tenant_id AS tenant_id,
  COUNT(*) AS total_pending
FROM requirement_requests
WHERE status IN ('SUBMITTED', 'REVISION_REQUESTED')
GROUP BY source_tenant_id
UNION ALL
SELECT
  'FINANCE' AS request_type,
  source_tenant_id AS tenant_id,
  COUNT(*) AS total_pending
FROM finance_requests
WHERE status IN ('SUBMITTED', 'REVISION_REQUESTED')
GROUP BY source_tenant_id
UNION ALL
SELECT
  'WORK_PROGRAM' AS request_type,
  tenant_id,
  COUNT(*) AS total_pending
FROM work_programs
WHERE status IN ('SUBMITTED', 'REVISION_REQUESTED')
  AND deleted_at IS NULL
GROUP BY tenant_id;

-- ==========================================================================
-- 16. SEED ROLE DAN PERMISSION DASAR
-- ==========================================================================

INSERT INTO roles (code, name, scope, description) VALUES
  ('SUPER_ADMIN', 'Super Admin', 'SYSTEM', 'Pengelola sistem tingkat institusi'),
  ('TENANT_ADMIN', 'Admin Tenant', 'TENANT', 'Administrator ORMAWA, HMJ, atau HIMA'),
  ('OFFICER', 'Pengurus', 'TENANT', 'Pengurus organisasi pada periode aktif'),
  ('MEMBER', 'Anggota', 'TENANT', 'Anggota organisasi dengan akses terbatas')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  scope = VALUES(scope),
  description = VALUES(description);

INSERT INTO permissions (code, name, scope, description) VALUES
  ('system.dashboard.view', 'Lihat dashboard sistem', 'SYSTEM', NULL),
  ('tenant.view_all', 'Lihat seluruh tenant', 'SYSTEM', NULL),
  ('tenant.review_top_level', 'Review akun ORMAWA/HMJ', 'SYSTEM', NULL),
  ('academic.manage', 'Kelola master akademik', 'SYSTEM', NULL),
  ('audit.view_all', 'Lihat audit seluruh sistem', 'SYSTEM', NULL),
  ('tenant.profile.manage', 'Kelola profil tenant', 'TENANT', NULL),
  ('members.view', 'Lihat anggota', 'TENANT', NULL),
  ('members.manage', 'Kelola anggota', 'TENANT', NULL),
  ('governance.view', 'Lihat kepengurusan', 'TENANT', NULL),
  ('governance.manage', 'Kelola kepengurusan', 'TENANT', NULL),
  ('programs.view', 'Lihat program kerja', 'TENANT', NULL),
  ('programs.manage', 'Kelola program kerja', 'TENANT', NULL),
  ('programs.review', 'Review program kerja HIMA', 'TENANT', NULL),
  ('requirements.view', 'Lihat pengajuan kebutuhan', 'TENANT', NULL),
  ('requirements.manage', 'Kelola pengajuan kebutuhan', 'TENANT', NULL),
  ('requirements.review', 'Review kebutuhan HIMA', 'TENANT', NULL),
  ('finance_requests.view', 'Lihat pengajuan keuangan', 'TENANT', NULL),
  ('finance_requests.manage', 'Kelola pengajuan keuangan', 'TENANT', NULL),
  ('finance_requests.review', 'Review keuangan HIMA', 'TENANT', NULL),
  ('finance.view', 'Lihat transaksi keuangan', 'TENANT', NULL),
  ('finance.manage', 'Kelola transaksi keuangan', 'TENANT', NULL),
  ('inventory.view', 'Lihat inventaris', 'TENANT', NULL),
  ('inventory.manage', 'Kelola inventaris', 'TENANT', NULL),
  ('messaging.use', 'Gunakan pesan HMJ-HIMA', 'TENANT', NULL),
  ('notifications.view', 'Lihat notifikasi', 'TENANT', NULL),
  ('audit.view_tenant', 'Lihat audit tenant', 'TENANT', NULL),
  ('hima_accounts.review', 'Review akun HIMA', 'TENANT', NULL)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  scope = VALUES(scope),
  description = VALUES(description);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
  ON p.code IN (
    'system.dashboard.view',
    'tenant.view_all',
    'tenant.review_top_level',
    'academic.manage',
    'audit.view_all'
  )
WHERE r.code = 'SUPER_ADMIN';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.scope = 'TENANT'
WHERE r.code = 'TENANT_ADMIN';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
  ON p.code IN (
    'members.view',
    'members.manage',
    'governance.view',
    'governance.manage',
    'programs.view',
    'programs.manage',
    'requirements.view',
    'requirements.manage',
    'finance_requests.view',
    'finance_requests.manage',
    'finance.view',
    'finance.manage',
    'inventory.view',
    'inventory.manage',
    'messaging.use',
    'notifications.view',
    'audit.view_tenant'
  )
WHERE r.code = 'OFFICER';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
  ON p.code IN (
    'members.view',
    'governance.view',
    'programs.view',
    'requirements.view',
    'finance_requests.view',
    'inventory.view',
    'messaging.use',
    'notifications.view'
  )
WHERE r.code = 'MEMBER';

-- ==========================================================================
-- SEED MASTER AKADEMIK — POLITEKNIK NEGERI LAMPUNG (POLINELA)
-- Sumber: https://polinela.ac.id/jurusan/
-- Diperbarui: September 2026
-- ==========================================================================

INSERT INTO departments (code, name) VALUES
  ('BTP',  'Budidaya Tanaman Pangan'),
  ('BTKB', 'Budidaya Tanaman Perkebunan'),
  ('TP',   'Teknologi Pertanian'),
  ('PTR',  'Peternakan'),
  ('EB',   'Ekonomi dan Bisnis'),
  ('TK',   'Teknik'),
  ('PK',   'Perikanan dan Kelautan'),
  ('TI',   'Teknologi Informasi')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- -----------------------------------------------------------------------
-- 1. Budidaya Tanaman Pangan
-- -----------------------------------------------------------------------
INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'BTP-D4-TBN', 'Teknologi Perbenihan', 'D4'
FROM departments d WHERE d.code = 'BTP'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'BTP-D4-TPP', 'Teknologi Produksi Tanaman Pangan', 'D4'
FROM departments d WHERE d.code = 'BTP'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'BTP-D4-TPH', 'Teknologi Produksi Tanaman Hortikultura', 'D4'
FROM departments d WHERE d.code = 'BTP'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

-- -----------------------------------------------------------------------
-- 2. Budidaya Tanaman Perkebunan
-- -----------------------------------------------------------------------
INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'BTKB-D3-PTP', 'Produksi Tanaman Perkebunan', 'D3'
FROM departments d WHERE d.code = 'BTKB'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'BTKB-D4-PMIP', 'Produksi dan Manajemen Industri Perkebunan', 'D4'
FROM departments d WHERE d.code = 'BTKB'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'BTKB-D4-PPK', 'Pengelolaan Perkebunan Kopi', 'D4'
FROM departments d WHERE d.code = 'BTKB'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'BTKB-D4-TPTP', 'Teknologi Produksi Tanaman Perkebunan', 'D4'
FROM departments d WHERE d.code = 'BTKB'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

-- -----------------------------------------------------------------------
-- 3. Teknologi Pertanian
-- -----------------------------------------------------------------------
INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'TP-D3-MP', 'Mekanisasi Pertanian', 'D3'
FROM departments d WHERE d.code = 'TP'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'TP-D3-TPN', 'Teknologi Pangan', 'D3'
FROM departments d WHERE d.code = 'TP'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'TP-D4-PPA', 'Pengembangan Produk Agroindustri', 'D4'
FROM departments d WHERE d.code = 'TP'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'TP-D4-KT', 'Kimia Terapan', 'D4'
FROM departments d WHERE d.code = 'TP'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'TP-D4-TPH', 'Teknologi Pangan Halal', 'D4'
FROM departments d WHERE d.code = 'TP'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'TP-D4-GK', 'Gizi Klinis', 'D4'
FROM departments d WHERE d.code = 'TP'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

-- -----------------------------------------------------------------------
-- 4. Peternakan
-- -----------------------------------------------------------------------
INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'PTR-D4-TPT', 'Teknologi Pakan Ternak', 'D4'
FROM departments d WHERE d.code = 'PTR'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'PTR-D4-TPRT', 'Teknologi Produksi Ternak', 'D4'
FROM departments d WHERE d.code = 'PTR'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'PTR-D4-AP', 'Agribisnis Peternakan', 'D4'
FROM departments d WHERE d.code = 'PTR'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

-- -----------------------------------------------------------------------
-- 5. Ekonomi dan Bisnis
-- -----------------------------------------------------------------------
INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'EB-D3-PW', 'Perjalanan Wisata', 'D3'
FROM departments d WHERE d.code = 'EB'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'EB-D4-AGP', 'Agribisnis Pangan', 'D4'
FROM departments d WHERE d.code = 'EB'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'EB-D4-PA', 'Pengelolaan Agribisnis', 'D4'
FROM departments d WHERE d.code = 'EB'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'EB-D4-AKP', 'Akuntansi Perpajakan', 'D4'
FROM departments d WHERE d.code = 'EB'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'EB-D4-ABD', 'Akuntansi Bisnis Digital', 'D4'
FROM departments d WHERE d.code = 'EB'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'EB-D4-PPH', 'Pengelolaan Perhotelan', 'D4'
FROM departments d WHERE d.code = 'EB'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'EB-D4-PKA', 'Pengelolaan Konvensi dan Acara', 'D4'
FROM departments d WHERE d.code = 'EB'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'EB-D4-BIKBP', 'Bahasa Inggris untuk Komunikasi Bisnis dan Profesional', 'D4'
FROM departments d WHERE d.code = 'EB'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'EB-D4-PM', 'Produksi Media', 'D4'
FROM departments d WHERE d.code = 'EB'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'EB-D4-BD', 'Bisnis Digital', 'D4'
FROM departments d WHERE d.code = 'EB'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

-- -----------------------------------------------------------------------
-- 6. Teknik
-- -----------------------------------------------------------------------
INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'TK-D3-TSLL', 'Teknik Sumberdaya Lahan dan Lingkungan', 'D3'
FROM departments d WHERE d.code = 'TK'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'TK-D4-TRKJJ', 'Teknologi Rekayasa Konstruksi Jalan dan Jembatan', 'D4'
FROM departments d WHERE d.code = 'TK'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'TK-D4-TRKI', 'Teknologi Rekayasa Kimia Industri', 'D4'
FROM departments d WHERE d.code = 'TK'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'TK-D4-TRO', 'Teknologi Rekayasa Otomotif', 'D4'
FROM departments d WHERE d.code = 'TK'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

-- -----------------------------------------------------------------------
-- 7. Perikanan dan Kelautan
-- -----------------------------------------------------------------------
INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'PK-D3-BP', 'Budidaya Perikanan', 'D3'
FROM departments d WHERE d.code = 'PK'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'PK-D3-PT', 'Perikanan Tangkap', 'D3'
FROM departments d WHERE d.code = 'PK'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'PK-D4-TPI', 'Teknologi Pembenihan Ikan', 'D4'
FROM departments d WHERE d.code = 'PK'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'PK-D4-TAK', 'Teknologi Akuakultur', 'D4'
FROM departments d WHERE d.code = 'PK'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'PK-D4-TCPI', 'Teknologi Cerdas Penangkapan Ikan', 'D4'
FROM departments d WHERE d.code = 'PK'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

-- -----------------------------------------------------------------------
-- 8. Teknologi Informasi
-- -----------------------------------------------------------------------
INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'TI-D3-MI', 'Manajemen Informatika', 'D3'
FROM departments d WHERE d.code = 'TI'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'TI-D4-TRI', 'Teknologi Rekayasa Internet', 'D4'
FROM departments d WHERE d.code = 'TI'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'TI-D4-TRPL', 'Teknologi Rekayasa Perangkat Lunak', 'D4'
FROM departments d WHERE d.code = 'TI'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'TI-D4-TRE', 'Teknologi Rekayasa Elektronika', 'D4'
FROM departments d WHERE d.code = 'TI'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);

INSERT INTO study_programs (department_id, code, name, degree_level)
SELECT d.id, 'TI-D4-SDT', 'Sains Data Terapan', 'D4'
FROM departments d WHERE d.code = 'TI'
ON DUPLICATE KEY UPDATE name = VALUES(name), degree_level = VALUES(degree_level);



-- ==========================================================================
-- CATATAN: TENANT SETTINGS (Opsional / Fase 2)
-- Jika dibutuhkan konfigurasi per-tenant (notif preference, batas upload, dsb),
-- tambahkan tabel berikut:
--
-- CREATE TABLE IF NOT EXISTS tenant_settings (
--   tenant_id    BIGINT UNSIGNED NOT NULL,
--   setting_key  VARCHAR(100) NOT NULL,
--   setting_value TEXT NULL,
--   updated_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
--                  ON UPDATE CURRENT_TIMESTAMP(3),
--   PRIMARY KEY (tenant_id, setting_key),
--   CONSTRAINT fk_tenant_settings_tenant
--     FOREIGN KEY (tenant_id) REFERENCES tenants (id)
--     ON UPDATE CASCADE ON DELETE CASCADE
-- ) ENGINE=InnoDB;
-- ==========================================================================

SET FOREIGN_KEY_CHECKS = 1;

-- Ringkasan objek (setelah penambahan):
-- 37 tabel, 5 view, 8 trigger, 4 role, dan 27 permission.
-- Tabel tambahan: email_verifications, proposal_review_comments,
--   requirement_request_files, finance_request_files,
--   finance_request_files (sudah ada di atas), v_work_program_summary,
--   v_member_counts, v_pending_requests.
-- Kolom tambahan: finance_request_items.note, inventory_items.updated_by_user_id.
-- Indeks tambahan: financial_transactions.finance_request_id,
--   messages(conversation_id, sender_tenant_id).
-- Permission OFFICER: ditambah governance.manage, finance.manage, audit.view_tenant.
-- Jalankan seluruh perubahan workflow melalui service layer agar status history,
-- notifikasi, audit log, dan transaksi bisnis tetap konsisten.
