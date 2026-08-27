export function onlyDigits(value: string) { return value.replace(/\D/g, ""); }
export function maskCnpj(value: string) {
  const digits = onlyDigits(value).slice(0, 14);
  return digits.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
}
export function parseCnpjList(value: string) { return value.split(/[\n,;]+/).map(onlyDigits).filter(v => v.length > 0).slice(0, 500); }
export function canAnalyzeIndividual(cnpj: string, hasConfirmedReview: boolean) { return onlyDigits(cnpj).length === 14 && hasConfirmedReview; }
