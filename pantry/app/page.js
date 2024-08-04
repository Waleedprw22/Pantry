"use client";
import { Box, Stack, Typography, Button, Modal, TextField, InputBase, MenuItem, FormControl, Select } from '@mui/material';
import { firestore } from './firebase';
import { collection, doc, getDocs, query, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import React, { useState, useEffect, useRef } from 'react';
import { Camera } from "react-camera-pro";

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'white',
  border: '5px solid #ADD8E6',
  boxShadow: 24,
  p: 4,
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
};

export default function Home() {
  const [inventory, setInventory] = useState([]);
  const [openAddItemModal, setOpenAddItemModal] = useState(false);
  const [openCameraModal, setOpenCameraModal] = useState(false);
  const [openUploadModal, setOpenUploadModal] = useState(false);
  const [itemName, setItemName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCriteria, setFilterCriteria] = useState('');
  const camera = useRef(null);
  const [image, setImage] = useState(null);

  const updateInventory = async () => {
    const snapshot = query(collection(firestore, 'inventory'));
    const docs = await getDocs(snapshot);
    const inventoryList = [];
    docs.forEach((doc) => {
      inventoryList.push({ name: doc.id, ...doc.data() });
    });
    setInventory(inventoryList);
  };

  useEffect(() => {
    updateInventory();
  }, []);

  const addItem = async (item) => {
    const docRef = doc(collection(firestore, 'inventory'), item);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const { quantity } = docSnap.data();
      await setDoc(docRef, { quantity: quantity + 1 });
    } else {
      await setDoc(docRef, { quantity: 1 });
    }
    await updateInventory();
  };

  const removeItem = async (item) => {
    const docRef = doc(collection(firestore, 'inventory'), item);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const { quantity } = docSnap.data();
      if (quantity === 1) {
        await deleteDoc(docRef);
      } else {
        await setDoc(docRef, { quantity: quantity - 1 });
      }
    }
    await updateInventory();
  };

  const handleOpenAddItemModal = () => setOpenAddItemModal(true);
  const handleCloseAddItemModal = () => setOpenAddItemModal(false);
  const handleOpenCameraModal = () => setOpenCameraModal(true);
  const handleCloseCameraModal = () => setOpenCameraModal(false);
  const handleOpenUploadModal = () => setOpenUploadModal(true);
  const handleCloseUploadModal = () => setOpenUploadModal(false);

  const updateInventoryFromData = async (data) => {
    for (const [item, quantity] of Object.entries(data)) {
      const docRef = doc(collection(firestore, 'inventory'), item);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const currentQuantity = docSnap.data().quantity;
        await setDoc(docRef, { quantity: currentQuantity + quantity });
      } else {
        await setDoc(docRef, { quantity });
      }
    }
    await updateInventory();
  };

  const handleCapturePhoto = async () => {
    const photoBlob = await camera.current.takePhoto();
    if (photoBlob) {
      const formData = new FormData();
      formData.append('image', photoBlob, 'captured.jpg');

      try {
        const response = await fetch('http://localhost:3000/upload-image', {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        setImage(data.publicUrl);

        if (data.processedData) {
          await updateInventoryFromData(data.processedData);
        }

      } catch (error) {
        console.error('Error uploading image:', error);
      }
      handleCloseCameraModal();
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('image', file);
  
      try {
        const response = await fetch('http://localhost:3000/upload-image', {
          method: 'POST',
          body: formData,
        });
  
        if (!response.ok) {
          // Check for error status codes and throw an error with a message
          const errorData = await response.json();
          throw new Error(`Server error: ${errorData.error || 'Unknown error'}`);
        }
  
        const data = await response.json();
        setImage(data.publicUrl); // Save the uploaded image URL
      } catch (error) {
        console.error('Error uploading image:', error.message);
        // Optionally, you can show an error message to the user
        alert(`Error: ${error.message}`);
      }
      handleCloseUploadModal();
    }
  };
  

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (filterCriteria ? item.quantity === parseInt(filterCriteria) : true)
  );

  return (
    <Box
      width="100vw"
      height="100vh"
      display="flex"
      flexDirection="row"
      alignItems="flex-start"
    >
      <Box
        width="20%"
        display="flex"
        flexDirection="column"
        alignItems="flex-start"
        padding={2}
        gap={2}
        mt={4}
      >
        <Button variant="contained" onClick={handleOpenAddItemModal}>
          Add New Item
        </Button>
        <Button variant="contained" onClick={handleOpenCameraModal}>
          Open Camera
        </Button>
        <Button variant="contained" onClick={handleOpenUploadModal}>
          Upload Image
        </Button>
      </Box>

      <Box
        width="80%"
        display="flex"
        justifyContent="center"
        alignItems="center"
        flexDirection="column"
        gap={2}
        padding={2}
      >
        <Box border="1px solid #333" width="100%">
          <Box
            width="100%"
            height="100px"
            bgcolor="#ADD8E6"
            display="flex"
            justifyContent="center"
            alignItems="center"
          >
            <Typography variant="h3" color="#333" textAlign="center">
              Inventory Items
            </Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" padding={2}>
            <InputBase
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ flex: 1, border: '1px solid #ccc', padding: '0 10px' }}
            />
            <FormControl sx={{ minWidth: 120 }}>
              <Select
                value={filterCriteria}
                onChange={(e) => setFilterCriteria(e.target.value)}
                displayEmpty
              >
                <MenuItem value="">
                  <em>All</em>
                </MenuItem>
                <MenuItem value={1}>Quantity: 1</MenuItem>
                <MenuItem value={2}>Quantity: 2</MenuItem>
                <MenuItem value={3}>Quantity: 3</MenuItem>
                {/* Add more filter options as needed */}
              </Select>
            </FormControl>
          </Box>
          <Stack width="100%" height="500px" spacing={2} overflow="auto">
            {filteredInventory.map(({ name, quantity }) => (
              <Box
                key={name}
                width="100%"
                minHeight="100px"
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                bgcolor="#f0f0f0"
                paddingX={5}
              >
                <Typography variant="h4" color="#333" textAlign="center">
                  {name.charAt(0).toUpperCase() + name.slice(1)}
                </Typography>
                <Typography variant="h4" color="#333" textAlign="center">
                  Quantity: {quantity}
                </Typography>
                <Button variant="contained" onClick={() => removeItem(name)}>
                  Remove
                </Button>
              </Box>
            ))}
          </Stack>
        </Box>
      </Box>

      <Modal
        open={openAddItemModal}
        onClose={handleCloseAddItemModal}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2">
            Add New Item
          </Typography>
          <TextField
            label="Item Name"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
          />
          <Button variant="contained" onClick={() => addItem(itemName)}>
            Add Item
          </Button>
          <Button variant="contained" color="error" onClick={handleCloseAddItemModal}>
            Close
          </Button>
        </Box>
      </Modal>

      <Modal
        open={openCameraModal}
        onClose={handleCloseCameraModal}
        aria-labelledby="modal-camera-title"
        aria-describedby="modal-camera-description"
      >
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2">
            Capture Item Photo
          </Typography>
          <Camera ref={camera} />
          <Button variant="contained" onClick={handleCapturePhoto}>
            Capture Photo
          </Button>
          <Button variant="contained" color="error" onClick={handleCloseCameraModal}>
            Close
          </Button>
        </Box>
      </Modal>

      <Modal
        open={openUploadModal}
        onClose={handleCloseUploadModal}
        aria-labelledby="modal-upload-title"
        aria-describedby="modal-upload-description"
      >
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2">
            Upload Item Image
          </Typography>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
          />
          <Button variant="contained" color="error" onClick={handleCloseUploadModal}>
            Close
          </Button>
        </Box>
      </Modal>
    </Box>
  );
}
