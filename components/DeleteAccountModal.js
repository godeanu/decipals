// src/components/DeleteAccountModal.js
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';

const DeleteAccountModal = ({ visible, onClose, onDeleteAccount }) => {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const navigation = useNavigation();

  const handleClose = () => {
    setConfirmText('');
    onClose();
  };

  const handleConfirmDelete = async () => {
    if (confirmText.toLowerCase() !== 'delete') {
      Alert.alert('Error', 'Please type "delete" to confirm');
      return;
    }

    setIsDeleting(true);

    try {
      await onDeleteAccount();
      
      // Don't rely on the onDeleteAccount function to handle navigation
      // Instead, explicitly reset navigation to login screen here
      setIsDeleting(false);
      setConfirmText('');
      onClose();

      // Reset the entire navigation stack to avoid navigation issues
      setTimeout(() => {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          })
        );
      }, 500);
      
    } catch (error) {
      setIsDeleting(false);
      Alert.alert('Error', error.message || 'Failed to delete account');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Delete Account</Text>
          
          <Text style={styles.warningText}>
            Warning: This action cannot be undone. All your data will be permanently deleted.
          </Text>
          
          <Text style={styles.confirmText}>
            Type "delete" below to confirm:
          </Text>
          
          <TextInput
            style={styles.input}
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder="Type 'delete' here"
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={handleClose}
              disabled={isDeleting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.deleteButton,
                confirmText.toLowerCase() !== 'delete' && styles.disabledButton,
                isDeleting && styles.disabledButton
              ]} 
              onPress={handleConfirmDelete}
              disabled={confirmText.toLowerCase() !== 'delete' || isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.deleteButtonText}>Delete Account</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#ff4c4c',
  },
  warningText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
    lineHeight: 22,
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f1f1f1',
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  deleteButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#ff4c4c',
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ffb3b3',
    opacity: 0.6,
  },
});

export default DeleteAccountModal;