-- 为活动表添加最大参与人数字段和图片URL字段
ALTER TABLE `activities` 
ADD COLUMN `max_participants` int(11) DEFAULT 20 AFTER `points`,
ADD COLUMN `image_url` varchar(255) DEFAULT NULL AFTER `max_participants`;

-- 更新活动状态枚举类型，添加upcoming和ongoing状态
ALTER TABLE `activities` 
MODIFY COLUMN `status` enum('pending','approved','rejected','completed','upcoming','ongoing') DEFAULT 'pending';

-- 创建索引以提高查询性能
CREATE INDEX idx_activities_status ON activities(status);
CREATE INDEX idx_activities_start_time ON activities(start_time);
CREATE INDEX idx_activities_end_time ON activities(end_time);

-- 创建一个触发器来自动更新活动状态
DELIMITER //
CREATE TRIGGER update_activity_status
BEFORE SELECT ON activities
FOR EACH ROW
BEGIN
  -- 如果活动已审核通过，根据时间更新状态
  IF OLD.status = 'approved' THEN
    IF NOW() < OLD.start_time THEN
      SET NEW.status = 'upcoming';
    ELSEIF NOW() BETWEEN OLD.start_time AND OLD.end_time THEN
      SET NEW.status = 'ongoing';
    ELSEIF NOW() > OLD.end_time THEN
      SET NEW.status = 'completed';
    END IF;
  END IF;
END; //
DELIMITER ; 