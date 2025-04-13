const express = require('express');
const {
  createUser,
  deleteUser,
  getUser,
  getUsers,
  updateUser,
} = require('../../../controllers/auth/admin/admin.controller');
const {
  userMustBeAdmin,
  userMustBeLogged,
} = require('../../../middlewares/auth.middleware');

const router = express.Router();

router.use(userMustBeLogged);
router.use(userMustBeAdmin);

router.get('/', getUsers);
router.post('/', createUser);
router.get('/:id', getUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
