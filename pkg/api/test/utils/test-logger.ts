// Утилита для логирования результатов тестов в файлы

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

interface TestResult {
  testName: string;
  status: "passed" | "failed" | "skipped";
  duration: number;
  error?: string;
  data?: Record<string, any>;
  timestamp: string;
}

interface TestSuiteResult {
  suiteName: string;
  startTime: string;
  endTime: string;
  duration: number;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  results: TestResult[];
}

export class TestLogger {
  private results: TestResult[] = [];
  private suiteName: string;
  private startTime: Date;

  constructor(suiteName: string) {
    this.suiteName = suiteName;
    this.startTime = new Date();
  }

  logResult(result: Omit<TestResult, "timestamp">) {
    this.results.push({
      ...result,
      timestamp: new Date().toISOString(),
    });
  }

  async saveResults(): Promise<string> {
    const endTime = new Date();
    const duration = endTime.getTime() - this.startTime.getTime();

    const suiteResult: TestSuiteResult = {
      suiteName: this.suiteName,
      startTime: this.startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration,
      totalTests: this.results.length,
      passed: this.results.filter((r) => r.status === "passed").length,
      failed: this.results.filter((r) => r.status === "failed").length,
      skipped: this.results.filter((r) => r.status === "skipped").length,
      results: this.results,
    };

    // Создаем директорию test/logs если её нет
    const logsDir = join(process.cwd(), "test", "logs");
    await mkdir(logsDir, { recursive: true });

    // Формируем имя файла с текущей датой
    const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const filename = `${date}.json`;
    const filepath = join(logsDir, filename);

    // Читаем существующие результаты, если файл есть
    let existingResults: TestSuiteResult[] = [];
    try {
      const { readFile } = await import("fs/promises");
      const existingContent = await readFile(filepath, "utf-8");
      existingResults = JSON.parse(existingContent);
    } catch {
      // Файл не существует или пустой - это нормально
    }

    // Добавляем новые результаты
    existingResults.push(suiteResult);

    // Сохраняем в JSON формате
    await writeFile(filepath, JSON.stringify(existingResults, null, 2), "utf-8");

    return filepath;
  }

  getResults(): TestResult[] {
    return this.results;
  }
}

