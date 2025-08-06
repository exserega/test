#!/usr/bin/env node

/**
 * Firebase Helper Script
 * Вспомогательный скрипт для работы с Firebase в среде Cursor Agent
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Команды Firebase
const commands = {
  // Пользователи
  listUsers: async () => {
    const { stdout } = await execAsync('npx firebase-tools@latest auth:export users.json');
    const users = JSON.parse(require('fs').readFileSync('users.json', 'utf8'));
    console.log('Пользователи:', users);
    return users;
  },

  // Firestore
  getCollection: async (collection) => {
    const { stdout } = await execAsync(`npx firebase-tools@latest firestore:get ${collection}`);
    console.log(`Коллекция ${collection}:`, stdout);
    return stdout;
  },

  // Deploy
  deployRules: async () => {
    const { stdout } = await execAsync('npx firebase-tools@latest deploy --only firestore:rules');
    console.log('Rules deployed:', stdout);
    return stdout;
  }
};

// CLI интерфейс
const command = process.argv[2];
const args = process.argv.slice(3);

if (commands[command]) {
  commands[command](...args)
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Ошибка:', err);
      process.exit(1);
    });
} else {
  console.log('Доступные команды:');
  console.log('- listUsers: Список пользователей');
  console.log('- getCollection [name]: Получить коллекцию');
  console.log('- deployRules: Деплой правил безопасности');
}