const { getAll, getById, add, updateById, deleteById, updateStatusContact } = require("./contacts");
const { register, verifyEmail, resendVerifyEmail, login, getCurrent, logout, updateAvatar} = require("./users")

module.exports = {
    getAll,
    getById,
    add,
    updateById,
    deleteById,
    updateStatusContact,
    register,
    verifyEmail,
    resendVerifyEmail,
    login,
    getCurrent,
    logout,
    updateAvatar,
}