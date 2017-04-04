function getResponsibleService() {

	var query =	
		
		

	"	SELECT DOMVALUE_INT, DDTEXT FROM  " +
	" \"_SYS_BIC\".\"bobj_repo.views/CV_SP_RESPONSIBLE_SERVICE\"  "
	
	var conn = $.db.getConnection();
	var pstmt = conn.prepareStatement(query);
	var rs = pstmt.executeQuery();
	var data = [];

	while (rs.next()) {
		data.push({
			"ID" : rs.getInteger(1),
			"NAME" : rs.getNString(2)
			
		});
	}

	$.response.setBody(JSON.stringify(data));
	$.response.contentType = 'application/json';
	$.response.status = $.net.http.OK;
	conn.commit();
	conn.close();

}
getResponsibleService();
