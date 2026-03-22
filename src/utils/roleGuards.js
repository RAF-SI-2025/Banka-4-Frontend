export function isSupervisorLike(user) {
  return user?.is_admin === true || user?.identity_type === 'SUPERVISOR';
}