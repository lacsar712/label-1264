const { User } = require('../../models');

async function getSettingsData(userId) {
  const user = await User.findByPk(userId);
  if (!user) return null;

  return {
    profile: {
      name: user.name,
      username: user.username,
      role: user.role,
      avatarColor: user.avatarColor,
      subjectPreference: user.subjectPreference || [],
      chartTheme: user.chartTheme,
    },
    adminPreferences: user.role === 'admin' ? (user.adminPreferences || { pageSize: 20, tableDensity: 'default' }) : null,
  };
}

module.exports = { getSettingsData };
