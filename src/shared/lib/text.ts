import { getFileExtension } from "./file";

export const timeRead = (text: string | number): number =>
	Math.ceil((typeof text === 'string' ? text.split(' ').length : text) / 200);

export const isUrl = (text: string): boolean => {
	const urlRegex = /^(https?:\/\/)?([\w\-]+\.)+[a-z]{2,}(\/[^\s]*)?$/i;
	return urlRegex.test(text);
};

export function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 Б';

	const units = ['Б', 'Кб', 'Мб', 'Гб', 'Тб'];
	const base = 1024; // 1 КБ = 1024 Б, 1 МБ = 1024 КБ и т.д.

	// Вычисляем порядок величины (логарифм по основанию 1024)
	const order = Math.floor(Math.log(bytes) / Math.log(base));

	// Ограничиваем порядок величины количеством доступных единиц
	const adjustedOrder = Math.min(order, units.length - 1);

	// Вычисляем размер в выбранной единице
	const size = (bytes / Math.pow(base, adjustedOrder)).toFixed(1);

	// Убираем лишние нули после запятой, если они есть
	const formattedSize = size.replace(/\.0$/, '');

	return `${formattedSize} ${units[adjustedOrder]}`;
}

export const getReadTimeChars = (ext: string, chars: number) => {
  const factorMap: Record<string, number> = {
    cbz: 0.0002,
    epub: 0.85,
    fb2: 0.85,
    mobi: 0.8,
    pdf: 0.75,
    txt: 1,
  };

  const factor = factorMap[ext] ?? 0.7;

  return Math.floor(chars * factor);
};
