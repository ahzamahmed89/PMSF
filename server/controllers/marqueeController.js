import sql from 'mssql';
import { getPool } from '../config/database.js';

// Get all active marquee items (only enabled items)
export const getMarqueeItems = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT id, text_content, icon, display_order, is_enabled
        FROM marquee_items
        WHERE is_enabled = 1
        ORDER BY display_order ASC
      `);
    
    res.json({
      success: true,
      items: result.recordset
    });
  } catch (error) {
    console.error('Error fetching marquee items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch marquee items'
    });
  }
};

// Add new marquee item
export const addMarqueeItem = async (req, res) => {
  try {
    const { text_content, icon } = req.body;
    const username = req.user?.username || 'Unknown';

    if (!text_content || text_content.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Text content is required'
      });
    }

    const pool = await getPool();
    
    // Get the next display order
    const maxOrderResult = await pool.request()
      .query('SELECT ISNULL(MAX(display_order), 0) as max_order FROM marquee_items');
    const nextOrder = maxOrderResult.recordset[0].max_order + 1;

    // Insert new item
    const result = await pool.request()
      .input('text_content', sql.NVarChar(500), text_content.trim())
      .input('icon', sql.NVarChar(10), icon || null)
      .input('display_order', sql.Int, nextOrder)
      .input('created_by', sql.NVarChar(100), username)
      .input('updated_by', sql.NVarChar(100), username)
      .query(`
        INSERT INTO marquee_items (text_content, icon, display_order, is_enabled, created_by, updated_by)
        OUTPUT INSERTED.*
        VALUES (@text_content, @icon, @display_order, 1, @created_by, @updated_by)
      `);

    res.json({
      success: true,
      message: 'Marquee item added successfully',
      item: result.recordset[0]
    });
  } catch (error) {
    console.error('Error adding marquee item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add marquee item'
    });
  }
};

// Update marquee item
export const updateMarqueeItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { text_content, icon, is_enabled } = req.body;
    const username = req.user?.username || 'Unknown';

    if (!text_content || text_content.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Text content is required'
      });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('text_content', sql.NVarChar(500), text_content.trim())
      .input('icon', sql.NVarChar(10), icon || null)
      .input('is_enabled', sql.Bit, is_enabled !== undefined ? is_enabled : true)
      .input('updated_by', sql.NVarChar(100), username)
      .query(`
        UPDATE marquee_items
        SET text_content = @text_content,
            icon = @icon,
            is_enabled = @is_enabled,
            updated_at = GETDATE(),
            updated_by = @updated_by
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Marquee item not found'
      });
    }

    res.json({
      success: true,
      message: 'Marquee item updated successfully',
      item: result.recordset[0]
    });
  } catch (error) {
    console.error('Error updating marquee item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update marquee item'
    });
  }
};

// Delete marquee item (hard delete)
export const deleteMarqueeItem = async (req, res) => {
  try {
    const { id } = req.params;
    const username = req.user?.username || 'Unknown';

    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        DELETE FROM marquee_items
        WHERE id = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: 'Marquee item not found'
      });
    }

    res.json({
      success: true,
      message: 'Marquee item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting marquee item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete marquee item'
    });
  }
};

// Toggle marquee item enabled/disabled status
export const toggleMarqueeItem = async (req, res) => {
  try {
    const { id } = req.params;
    const username = req.user?.username || 'Unknown';

    const pool = await getPool();
    
    // Get current status
    const currentResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT is_enabled FROM marquee_items WHERE id = @id');
    
    if (currentResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Marquee item not found'
      });
    }
    
    const newStatus = currentResult.recordset[0].is_enabled === 1 ? 0 : 1;
    
    // Update status
    const updateResult = await pool.request()
      .input('id', sql.Int, id)
      .input('is_enabled', sql.Bit, newStatus)
      .input('updated_by', sql.NVarChar(100), username)
      .query(`
        UPDATE marquee_items
        SET is_enabled = @is_enabled,
            updated_at = GETDATE(),
            updated_by = @updated_by
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    res.json({
      success: true,
      message: newStatus === 1 ? 'Item enabled' : 'Item disabled',
      item: updateResult.recordset[0]
    });
  } catch (error) {
    console.error('Error toggling marquee item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle marquee item'
    });
  }
};

