import { FC, useState, useRef, useEffect } from "react";
import { UserInfo } from "../../context/types";
import { getInitials } from "../../utils/userNames";
import "./active-users.scss";

interface ActiveUsersProps {
  users: UserInfo[];
  currentUserId: string | null;
}

const ActiveUsers: FC<ActiveUsersProps> = ({ users, currentUserId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Show max 3 avatars in collapsed view
  const visibleUsers = users.slice(0, 3);
  const remainingCount = users.length - 3;

  return (
    <div className="active-users" ref={dropdownRef}>
      {/* Collapsed Button */}
      <button
        className="active-users__trigger"
        onClick={() => setIsOpen(!isOpen)}
        title={`${users.length} active user${users.length !== 1 ? "s" : ""}`}
      >
        {/* Overlapping Avatars */}
        <div className="active-users__avatars">
          {visibleUsers.map((user, index) => (
            <div
              key={user.clientId}
              className="active-users__avatar"
              style={{
                backgroundColor: user.color,
                zIndex: visibleUsers.length - index,
                marginLeft: index > 0 ? "-8px" : "0",
              }}
              title={user.name}
            >
              {getInitials(user.name)}
            </div>
          ))}
          {remainingCount > 0 && (
            <div
              className="active-users__avatar active-users__avatar--more"
              style={{
                zIndex: 0,
                marginLeft: "-8px",
              }}
            >
              +{remainingCount}
            </div>
          )}
        </div>

        {/* Chevron Icon */}
        <svg
          className={`active-users__chevron ${isOpen ? "active-users__chevron--open" : ""}`}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path
            d="M3 5L6 8L9 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="active-users__dropdown">
          <div className="active-users__dropdown-header">
            Active Users ({users.length})
          </div>
          <div className="active-users__list">
            {users.map((user) => (
              <div
                key={user.clientId}
                className={`active-users__user ${
                  user.clientId === currentUserId
                    ? "active-users__user--current"
                    : ""
                }`}
              >
                <div
                  className="active-users__avatar"
                  style={{ backgroundColor: user.color }}
                >
                  {getInitials(user.name)}
                </div>
                <span className="active-users__name">
                  {user.name}
                  {user.clientId === currentUserId && (
                    <span className="active-users__badge">(You)</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveUsers;
