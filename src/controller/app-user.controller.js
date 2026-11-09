import { StatusCodes } from 'http-status-codes';
import AppUser from '../models/app-user.model.js';
import AppScope from '../models/app-scope.model.js';
import { roles } from '../constants/role-enum.js';

// Check if a user is app
export const checkAccess = async (req, res) => {
  const email = req.user.email?.toLowerCase();

  if (!email) {
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Email is required.' });
  }

  try {
    const user = await AppUser.findOne({ email });
    if (user) {
      const scopes = await AppScope.findOne({ role: user.role });
      return res.status(StatusCodes.OK).json({ success: true, canManageAccess: user.canManageAccess, role: user.role, scopes: scopes });
    } else {
      const scopes = await AppScope.findOne({ role: roles.Default });
      return res.status(StatusCodes.OK).json({ success: false, canManageAccess: false, role: roles.Default, scopes: scopes });
    }
  } catch (error) {
    console.error('Error checking access:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Internal server error.' });
  }
};

export const addAppUser = async (req, res) => {
  const email = req.body.email?.toLowerCase();
  const { canManageAccess, role } = req.body;
  const addedBy = req.user.name;

  if (!email) {
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Email is required.' });
  }

  try {
    const existingUser = await AppUser.findOne({ email });
    if (existingUser) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'User already exists.' });
    }

    const newUser = new AppUser({
      email,
      canManageAccess: canManageAccess || false,
      role,
      addedBy
    });

    await newUser.save();
    res.status(StatusCodes.CREATED).json({ success: true, message: 'User added successfully.', user: newUser });
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Internal server error.' });
  }
};

export const getAllAppUsers = async (req, res) => {
  try {
    const appUsers = await AppUser.find();
    res.status(StatusCodes.OK).json(appUsers);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

export const getAppUsersByRole = async (req, res) => {
  try {

    const pipeline = [];

    if (req.params.role) {
      pipeline.push({
        $match: { role: req.params.role },
      });
    }

    pipeline.push(
      {
        $lookup: {
          from: 'employees',
          localField: 'email',
          foreignField: 'emailId',
          as: 'employeeDetails',
        },
      },
      {
        $unwind: {
          path: '$employeeDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ['$$ROOT', '$employeeDetails']
          }
        }
      },
      {
        $project: {
          _id: 0,
          email: 1,
          id: 1,
          name: '$displayName',
          genisysId: 1
        }
      }
    );

    const appUsers = await AppUser.aggregate(pipeline);

    res.status(StatusCodes.OK).json(appUsers);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

export const updateAppUser = async (req, res) => {
  const { id } = req.params;
  const { email, canManageAccess, role } = req.body;

  if (!id) {
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'User ID is required.' });
  }

  try {
    const user = await AppUser.findById(id);

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'User not found.' });
    }

    user.email = email || user.email;
    user.canManageAccess = canManageAccess !== undefined ? canManageAccess : user.canManageAccess;
    user.role = role || user.role;

    const updatedUser = await user.save();

    res.status(StatusCodes.OK).json({ success: true, message: 'User updated successfully.', user: updatedUser });
  } catch (error) {
    console.error('Error editing user:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Internal server error.' });
  }
};

export const deleteAppUser = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'User ID is required.' });
  }

  try {
    const user = await AppUser.findById(id);

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'User not found.' });
    }

    await AppUser.findByIdAndDelete(id);

    res.status(StatusCodes.OK).json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Internal server error.' });
  }
};
